import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Question } from '../types/database';
import { FileText, Mic, Captions, Video, CheckCircle, Loader, AlertCircle, Download, Play } from 'lucide-react';

interface VideoCreationPanelProps {
  courseId: number;
  question: Question;
}

interface VideoRecord {
  id: string;
  script?: string;
  audio_url?: string;
  captions_data?: any;
  video_url?: string;
  status: string;
  template_id: number;
}

interface CaptionSegment {
  start: number;
  end: number;
  text: string;
  words?: Array<{ word: string; start: number; end: number }>;
}

interface GeneratedScript {
  text: string;
  examName: string;
}

interface GeneratedAudio {
  audioBlob: Blob;
  audioUrl: string;
  videoId: string;
}

interface GeneratedCaptions {
  captions: CaptionSegment[];
  videoId: string;
}

export default function VideoCreationPanel({ courseId, question }: VideoCreationPanelProps) {
  const [videoRecord, setVideoRecord] = useState<VideoRecord | null>(null);
  const [generatedScript, setGeneratedScript] = useState<GeneratedScript | null>(null);
  const [generatedAudio, setGeneratedAudio] = useState<GeneratedAudio | null>(null);
  const [generatedCaptions, setGeneratedCaptions] = useState<GeneratedCaptions | null>(null);
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [availableVideos, setAvailableVideos] = useState<VideoRecord[]>([]);
  const [selectedContent, setSelectedContent] = useState<'script' | 'captions' | null>(null);
  const [showScriptPreview, setShowScriptPreview] = useState(false);
  const [showCaptionPreview, setShowCaptionPreview] = useState(false);

  const GEMINI_API_KEY = 'AIzaSyDgShKEEeX9viEQ90JHAUBfwQqlu0c9rBw';
  const VOICE_API_KEY = 'sk_e7983a84b66dc07658f0286b863641fe7e87d7a93aca7c15';
  const VOICE_ID = '21m00Tcm4TlvDq8ikWAM';

  useEffect(() => {
    loadExistingVideo();
    loadAvailableVideos();
  }, [question.id]);

  const loadExistingVideo = async () => {
    const { data } = await supabase
      .from('videos')
      .select('*')
      .eq('question_id', question.id)
      .maybeSingle();

    if (data) {
      setVideoRecord(data);
    }
  };

  const loadAvailableVideos = async () => {
    const { data } = await supabase
      .from('videos')
      .select('*')
      .not('script', 'is', null)
      .is('audio_url', null)
      .order('created_at', { ascending: false })
      .limit(10);

    if (data) {
      setAvailableVideos(data);
    }
  };

  const generateScript = async () => {
    setLoading('script');
    setError(null);

    try {
      // First, get the exam name
      const { data: courseData } = await supabase
        .from('courses')
        .select('exam_id')
        .eq('id', courseId)
        .maybeSingle();

      let examName = 'this exam';
      if (courseData?.exam_id) {
        const { data: examData } = await supabase
          .from('exams')
          .select('name')
          .eq('id', courseData.exam_id)
          .maybeSingle();
        if (examData) examName = examData.name;
      }

      const prompt = `Create an engaging educational video script for this question. Follow this exact structure:

1. Start with: "Hello everyone, today we are going to solve a question for ${examName} entrance exam."
2. Say: "So the question says:" then read the question statement word by word
3. For MCQ/MSQ questions, read each option clearly: "Option A: [text], Option B: [text]" etc.
4. After reading the question and options, say: "Try solving this question on your own. I'll give you 5 seconds." [PAUSE 5 SECONDS - indicate with [COUNTDOWN: 5...4...3...2...1]]
5. Then reveal: "The answer is: ${question.answer}"
6. Finally explain the solution: ${question.solution || 'Provide a clear explanation'}
7. End with: "If you are looking for a complete guide for ${examName} or more practice questions and guidance, follow and comment ${examName} and it will be in your DMs."

Question: ${question.question_statement}
${question.options ? `Options: ${question.options}` : ''}
Answer: ${question.answer}
${question.solution ? `Solution: ${question.solution}` : ''}

Make the script conversational, engaging, and suitable for voice-over. Use simple language that sounds natural when spoken. The script should be read exactly as written by our text-to-speech system.`;

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${GEMINI_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }]
        })
      });

      if (!response.ok) throw new Error('Failed to generate script');

      const data = await response.json();
      const script = data.candidates[0]?.content?.parts[0]?.text;

      if (!script) throw new Error('No script generated');

      setGeneratedScript({ text: script, examName });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(null);
    }
  };

  const saveScriptToDatabase = async () => {
    if (!generatedScript) return;

    setLoading('saving');
    setError(null);

    try {
      const { data: video, error: dbError } = await supabase
        .from('videos')
        .insert({
          course_id: courseId,
          question_id: question.id,
          script: generatedScript.text,
          status: 'script_generated',
          template_id: Math.floor(Math.random() * 5) + 1
        })
        .select()
        .single();

      if (dbError) {
        console.error('Database error:', dbError);
        throw new Error(`Failed to save: ${dbError.message}`);
      }

      await supabase
        .from('new_questions')
        .update({ used_in_video: 'yes' })
        .eq('id', question.id);

      setVideoRecord(video);
      setGeneratedScript(null);
      await loadAvailableVideos();
    } catch (err: any) {
      console.error('Save error:', err);
      setError(err.message);
    } finally {
      setLoading(null);
    }
  };

  const generateVoiceOver = async (videoId?: string) => {
    const targetVideo = videoId
      ? availableVideos.find(v => v.id === videoId)
      : videoRecord;

    if (!targetVideo?.script) {
      setError('No script available for voice generation');
      return;
    }

    setLoading('audio');
    setError(null);

    try {
      const cleanScript = targetVideo.script
        .replace(/\[COUNTDOWN:.*?\]/g, '')
        .replace(/\*\*/g, '')
        .trim();

      const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`, {
        method: 'POST',
        headers: {
          'xi-api-key': VOICE_API_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: cleanScript,
          model_id: 'eleven_monolingual_v1',
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
            style: 0.0,
            use_speaker_boost: true
          }
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
        console.error('ElevenLabs error:', errorData);
        throw new Error(`Voice generation failed: ${errorData.detail?.message || errorData.message || 'API error'}`);
      }

      const audioBlob = await response.blob();

      if (audioBlob.size === 0) {
        throw new Error('Generated audio is empty');
      }

      const audioUrl = URL.createObjectURL(audioBlob);
      setGeneratedAudio({
        audioBlob,
        audioUrl,
        videoId: targetVideo.id
      });
    } catch (err: any) {
      console.error('Voice-over error:', err);
      setError(err.message || 'Failed to generate voice-over');
    } finally {
      setLoading(null);
    }
  };

  const saveAudioToDatabase = async () => {
    if (!generatedAudio) return;

    setLoading('saving-audio');
    setError(null);

    try {
      const reader = new FileReader();
      const base64Audio = await new Promise<string>((resolve, reject) => {
        reader.onloadend = () => {
          const base64 = reader.result as string;
          resolve(base64.split(',')[1]);
        };
        reader.onerror = reject;
        reader.readAsDataURL(generatedAudio.audioBlob);
      });

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const uploadResponse = await fetch(`${supabaseUrl}/functions/v1/upload-audio`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({
          video_id: generatedAudio.videoId,
          audio_base64: base64Audio,
          filename: `audio_${generatedAudio.videoId}_${Date.now()}.mp3`
        })
      });

      if (!uploadResponse.ok) {
        const errorData = await uploadResponse.json().catch(() => ({ error: 'Upload failed' }));
        throw new Error(`Audio upload failed: ${errorData.error || uploadResponse.statusText}`);
      }

      const uploadResult = await uploadResponse.json();

      if (!uploadResult.success || !uploadResult.audio_url) {
        throw new Error('Invalid upload response');
      }

      const { data: updated, error: updateError } = await supabase
        .from('videos')
        .update({
          audio_url: uploadResult.audio_url,
          status: 'audio_generated',
          updated_at: new Date().toISOString()
        })
        .eq('id', generatedAudio.videoId)
        .select()
        .single();

      if (updateError) {
        console.error('Database update error:', updateError);
        throw new Error(`Database update failed: ${updateError.message}`);
      }

      URL.revokeObjectURL(generatedAudio.audioUrl);
      setGeneratedAudio(null);
      setVideoRecord(updated);
      await loadAvailableVideos();
    } catch (err: any) {
      console.error('Save audio error:', err);
      setError(err.message || 'Failed to save audio');
    } finally {
      setLoading(null);
    }
  };

  const generateCaptions = async () => {
    if (!videoRecord?.audio_url) {
      setError('Audio URL is required for caption generation');
      return;
    }

    if (!videoRecord?.script) {
      setError('Script is required for caption generation');
      return;
    }

    setLoading('captions');
    setError(null);

    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const response = await fetch(`${supabaseUrl}/functions/v1/generate-captions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({
          video_id: videoRecord.id,
          audio_url: videoRecord.audio_url,
          script: videoRecord.script
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(`Caption generation failed: ${errorData.error || response.statusText}`);
      }

      const result = await response.json();

      if (!result.success || !result.captions) {
        throw new Error('Invalid caption data received');
      }

      setGeneratedCaptions({
        captions: result.captions,
        videoId: videoRecord.id
      });
    } catch (err: any) {
      console.error('Caption generation error:', err);
      setError(err.message || 'Failed to generate captions');
    } finally {
      setLoading(null);
    }
  };

  const saveCaptionsToDatabase = async () => {
    if (!generatedCaptions) return;

    setLoading('saving-captions');
    setError(null);

    try {
      const { data: updated, error: updateError } = await supabase
        .from('videos')
        .update({
          captions_data: generatedCaptions.captions,
          status: 'captions_generated',
          updated_at: new Date().toISOString()
        })
        .eq('id', generatedCaptions.videoId)
        .select()
        .single();

      if (updateError) {
        console.error('Database update error:', updateError);
        throw new Error(`Failed to save captions: ${updateError.message}`);
      }

      setGeneratedCaptions(null);
      setVideoRecord(updated);
    } catch (err: any) {
      console.error('Save captions error:', err);
      setError(err.message || 'Failed to save captions');
    } finally {
      setLoading(null);
    }
  };

  const generateVideo = async () => {
    if (!videoRecord?.captions_data) {
      setError('Captions are required for video rendering');
      return;
    }

    if (!videoRecord?.audio_url) {
      setError('Audio is required for video rendering');
      return;
    }

    setLoading('video');
    setError(null);

    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const response = await fetch(`${supabaseUrl}/functions/v1/render-video`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({
          video_id: videoRecord.id,
          template_id: videoRecord.template_id || 1
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(`Video rendering failed: ${errorData.error || response.statusText}`);
      }

      const result = await response.json();

      if (!result.success || !result.video_url) {
        throw new Error('Invalid video URL received');
      }

      // Show informative message if Python backend not configured
      if (!result.has_python_backend) {
        console.warn('Python backend not configured:', result.message);
        setError(`⚠️ ${result.message}`);
      }

      const { data: updated, error: updateError } = await supabase
        .from('videos')
        .update({
          video_url: result.video_url,
          status: result.has_python_backend ? 'video_rendered' : 'render_pending',
          updated_at: new Date().toISOString()
        })
        .eq('id', videoRecord.id)
        .select()
        .single();

      if (updateError) {
        console.error('Database update error:', updateError);
        throw new Error(`Failed to save video: ${updateError.message}`);
      }

      setVideoRecord(updated);
    } catch (err: any) {
      console.error('Video rendering error:', err);
      setError(err.message || 'Failed to render video');
    } finally {
      setLoading(null);
    }
  };

  const getStepStatus = (step: string) => {
    if (!videoRecord) return 'pending';

    const statusMap: Record<string, string[]> = {
      script: ['script_generated', 'audio_generated', 'captions_generated', 'video_rendered'],
      audio: ['audio_generated', 'captions_generated', 'video_rendered'],
      captions: ['captions_generated', 'video_rendered'],
      video: ['video_rendered']
    };

    return statusMap[step]?.includes(videoRecord.status) ? 'completed' : 'pending';
  };

  const downloadAudio = () => {
    if (!videoRecord?.audio_url) return;
    const link = document.createElement('a');
    link.href = videoRecord.audio_url;
    link.download = `audio_${videoRecord.id}.mp3`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = (seconds % 60).toFixed(2);
    return `${mins}:${secs.padStart(5, '0')}`;
  };

  return (
    <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
      <h3 className="text-xl font-semibold text-white mb-6">Video Creation Pipeline</h3>

      {error && (
        <div className="mb-4 p-4 bg-red-900/20 border border-red-500 rounded-lg flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-red-400" />
          <span className="text-red-400">{error}</span>
        </div>
      )}

      <div className="space-y-4">
        {/* Step 1: Generate Script */}
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <button
              onClick={generateScript}
              disabled={loading !== null || videoRecord !== null}
              className={`w-full flex items-center justify-between p-4 rounded-lg transition-all ${
                getStepStatus('script') === 'completed'
                  ? 'bg-green-600 text-white'
                  : 'bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50'
              }`}
            >
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5" />
                <div className="text-left">
                  <div className="font-medium">1. Generate Script</div>
                  <div className="text-sm opacity-80">Using Gemini AI</div>
                </div>
              </div>
              {loading === 'script' ? (
                <Loader className="w-5 h-5 animate-spin" />
              ) : getStepStatus('script') === 'completed' ? (
                <CheckCircle className="w-5 h-5" />
              ) : null}
            </button>
          </div>
        </div>

        {/* Script Preview */}
        {generatedScript && !videoRecord && (
          <div className="ml-8 space-y-4">
            <div className="p-4 bg-slate-700 rounded-lg max-h-96 overflow-y-auto">
              <h4 className="text-white font-medium mb-2">Generated Script Preview:</h4>
              <p className="text-slate-300 text-sm whitespace-pre-wrap">{generatedScript.text}</p>
            </div>
            <button
              onClick={saveScriptToDatabase}
              disabled={loading !== null}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-3 px-4 rounded-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading === 'saving' ? (
                <>
                  <Loader className="w-5 h-5 animate-spin" />
                  Saving to Database...
                </>
              ) : (
                <>
                  <CheckCircle className="w-5 h-5" />
                  Save to Database
                </>
              )}
            </button>
          </div>
        )}

        {videoRecord?.script && (
          <div className="ml-8 p-4 bg-slate-700 rounded-lg">
            <h4 className="text-green-400 font-medium mb-2 flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              Script saved to database
            </h4>
            <p className="text-slate-300 text-sm whitespace-pre-wrap">{videoRecord.script.substring(0, 200)}...</p>
          </div>
        )}

        {/* Step 2: Generate Voice Over */}
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <button
              onClick={() => generateVoiceOver()}
              disabled={!videoRecord?.script || loading !== null || videoRecord?.audio_url !== undefined}
              className={`w-full flex items-center justify-between p-4 rounded-lg transition-all ${
                getStepStatus('audio') === 'completed'
                  ? 'bg-green-600 text-white'
                  : 'bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 disabled:cursor-not-allowed'
              }`}
            >
              <div className="flex items-center gap-3">
                <Mic className="w-5 h-5" />
                <div className="text-left">
                  <div className="font-medium">2. Generate Voice Over</div>
                  <div className="text-sm opacity-80">TTS Audio Generation</div>
                </div>
              </div>
              {loading === 'audio' ? (
                <Loader className="w-5 h-5 animate-spin" />
              ) : getStepStatus('audio') === 'completed' ? (
                <CheckCircle className="w-5 h-5" />
              ) : null}
            </button>
          </div>
        </div>

        {/* Audio Preview */}
        {generatedAudio && !videoRecord?.audio_url && (
          <div className="ml-8 space-y-4">
            <div className="p-4 bg-slate-700 rounded-lg">
              <h4 className="text-white font-medium mb-3">Audio Preview:</h4>
              <audio controls className="w-full mb-3">
                <source src={generatedAudio.audioUrl} type="audio/mpeg" />
              </audio>
            </div>
            <button
              onClick={saveAudioToDatabase}
              disabled={loading !== null}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-3 px-4 rounded-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading === 'saving-audio' ? (
                <>
                  <Loader className="w-5 h-5 animate-spin" />
                  Saving to Supabase...
                </>
              ) : (
                <>
                  <CheckCircle className="w-5 h-5" />
                  Save to Supabase
                </>
              )}
            </button>
          </div>
        )}

        {/* Available Videos for Voice Over */}
        {availableVideos.length > 0 && (
          <div className="ml-8 p-4 bg-slate-700 rounded-lg">
            <h4 className="text-white font-medium mb-3">Or select a script to generate voice-over:</h4>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {availableVideos.map((video) => (
                <div
                  key={video.id}
                  className="flex items-center justify-between p-3 bg-slate-600 rounded hover:bg-slate-500 transition-colors"
                >
                  <div className="flex-1 mr-4">
                    <p className="text-slate-300 text-sm line-clamp-2">
                      {video.script?.substring(0, 100)}...
                    </p>
                  </div>
                  <button
                    onClick={() => generateVoiceOver(video.id)}
                    disabled={loading !== null}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded disabled:opacity-50 whitespace-nowrap"
                  >
                    Generate Audio
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {videoRecord?.audio_url && (
          <div className="ml-8 p-4 bg-slate-700 rounded-lg space-y-3">
            <h4 className="text-green-400 font-medium flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              Audio generated successfully
            </h4>
            <audio controls className="w-full">
              <source src={videoRecord.audio_url} type="audio/mpeg" />
            </audio>
            <div className="flex gap-2">
              <button
                onClick={downloadAudio}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded transition-colors"
              >
                <Download className="w-4 h-4" />
                Download Audio
              </button>
              <button
                onClick={() => {
                  setSelectedContent('script');
                  setShowScriptPreview(!showScriptPreview);
                }}
                className="flex items-center gap-2 px-4 py-2 bg-slate-600 hover:bg-slate-500 text-white text-sm rounded transition-colors"
              >
                <FileText className="w-4 h-4" />
                {showScriptPreview ? 'Hide' : 'View'} Script
              </button>
            </div>
            {showScriptPreview && videoRecord.script && (
              <div className="p-3 bg-slate-600 rounded max-h-60 overflow-y-auto">
                <p className="text-slate-200 text-sm whitespace-pre-wrap">{videoRecord.script}</p>
              </div>
            )}
          </div>
        )}

        {/* Step 3: Generate Captions */}
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <button
              onClick={generateCaptions}
              disabled={!videoRecord?.audio_url || loading !== null || videoRecord?.captions_data !== undefined}
              className={`w-full flex items-center justify-between p-4 rounded-lg transition-all ${
                getStepStatus('captions') === 'completed'
                  ? 'bg-green-600 text-white'
                  : 'bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 disabled:cursor-not-allowed'
              }`}
            >
              <div className="flex items-center gap-3">
                <Captions className="w-5 h-5" />
                <div className="text-left">
                  <div className="font-medium">3. Generate Captions</div>
                  <div className="text-sm opacity-80">Timing & Highlighting</div>
                </div>
              </div>
              {loading === 'captions' ? (
                <Loader className="w-5 h-5 animate-spin" />
              ) : getStepStatus('captions') === 'completed' ? (
                <CheckCircle className="w-5 h-5" />
              ) : null}
            </button>
          </div>
        </div>

        {/* Caption Preview */}
        {generatedCaptions && !videoRecord?.captions_data && (
          <div className="ml-8 space-y-4">
            <div className="p-4 bg-slate-700 rounded-lg">
              <h4 className="text-white font-medium mb-3">Caption Preview:</h4>
              <div className="max-h-96 overflow-y-auto space-y-2">
                {generatedCaptions.captions.map((caption: CaptionSegment, index: number) => (
                  <div key={index} className="p-2 bg-slate-600 rounded">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-blue-400 font-mono">
                        {formatTime(parseFloat(caption.start as any))} → {formatTime(parseFloat(caption.end as any))}
                      </span>
                    </div>
                    <p className="text-slate-200 text-sm">{caption.text}</p>
                  </div>
                ))}
              </div>
            </div>
            <button
              onClick={saveCaptionsToDatabase}
              disabled={loading !== null}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-3 px-4 rounded-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading === 'saving-captions' ? (
                <>
                  <Loader className="w-5 h-5 animate-spin" />
                  Saving to Supabase...
                </>
              ) : (
                <>
                  <CheckCircle className="w-5 h-5" />
                  Save to Supabase
                </>
              )}
            </button>
          </div>
        )}

        {videoRecord?.captions_data && (
          <div className="ml-8 p-4 bg-slate-700 rounded-lg space-y-3">
            <h4 className="text-green-400 font-medium flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              Captions saved to database
            </h4>
            <button
              onClick={() => {
                setSelectedContent('captions');
                setShowCaptionPreview(!showCaptionPreview);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-slate-600 hover:bg-slate-500 text-white text-sm rounded transition-colors"
            >
              <Captions className="w-4 h-4" />
              {showCaptionPreview ? 'Hide' : 'View'} Captions
            </button>
            {showCaptionPreview && (
              <div className="p-3 bg-slate-600 rounded max-h-96 overflow-y-auto">
                <div className="space-y-2">
                  {Array.isArray(videoRecord.captions_data) && videoRecord.captions_data.map((caption: CaptionSegment, index: number) => (
                    <div key={index} className="p-2 bg-slate-700 rounded">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-blue-400 font-mono">
                          {formatTime(parseFloat(caption.start as any))} → {formatTime(parseFloat(caption.end as any))}
                        </span>
                      </div>
                      <p className="text-slate-200 text-sm">{caption.text}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Step 4: Render Video */}
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <button
              onClick={generateVideo}
              disabled={!videoRecord?.captions_data || loading !== null}
              className={`w-full flex items-center justify-between p-4 rounded-lg transition-all ${
                getStepStatus('video') === 'completed'
                  ? 'bg-green-600 text-white'
                  : 'bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 disabled:cursor-not-allowed'
              }`}
            >
              <div className="flex items-center gap-3">
                <Video className="w-5 h-5" />
                <div className="text-left">
                  <div className="font-medium">4. Render Final Video</div>
                  <div className="text-sm opacity-80">Template {videoRecord?.template_id || 1}</div>
                </div>
              </div>
              {loading === 'video' ? (
                <Loader className="w-5 h-5 animate-spin" />
              ) : getStepStatus('video') === 'completed' ? (
                <CheckCircle className="w-5 h-5" />
              ) : null}
            </button>
          </div>
        </div>

        {videoRecord?.video_url && (
          <div className="mt-6 p-4 bg-green-900/20 border border-green-500 rounded-lg space-y-4">
            <h4 className="text-green-400 font-medium flex items-center gap-2">
              <CheckCircle className="w-5 h-5" />
              Video Ready!
            </h4>
            <video controls className="w-full rounded-lg">
              <source src={videoRecord.video_url} type="video/mp4" />
            </video>
            <div className="flex gap-3">
              <a
                href={videoRecord.video_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                <Play className="w-4 h-4" />
                Open in New Tab
              </a>
              <a
                href={videoRecord.video_url}
                download={`video_${videoRecord.id}.mp4`}
                className="flex items-center gap-2 px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
              >
                <Download className="w-4 h-4" />
                Download Video
              </a>
            </div>
            <p className="text-slate-400 text-xs break-all">{videoRecord.video_url}</p>
          </div>
        )}
      </div>
    </div>
  );
}
