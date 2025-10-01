import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface RenderRequest {
  video_id: string;
  template_id: number;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { video_id, template_id }: RenderRequest = await req.json();
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch video record with question data
    const { data: video, error: fetchError } = await supabase
      .from('videos')
      .select('*')
      .eq('id', video_id)
      .single();

    if (fetchError || !video) {
      throw new Error('Video record not found');
    }

    // Fetch question details
    const { data: question, error: questionError } = await supabase
      .from('new_questions')
      .select('question_statement, options, answer, solution')
      .eq('id', video.question_id)
      .single();

    if (questionError || !question) {
      throw new Error('Question data not found');
    }

    // In production, this would trigger a Python worker to render the video
    // For now, we'll create a comprehensive rendering specification

    // Video Rendering Specification for Python Backend
    const renderSpec = {
      video_id: video_id,
      template_id: template_id,

      // Audio
      audio_url: video.audio_url,

      // Captions with word-level highlighting
      captions: video.captions_data,

      // Question display data (for 5-second countdown section)
      question_data: {
        statement: question.question_statement,
        options: question.options,
        answer: question.answer,
        solution: question.solution
      },

      // Rendering instructions
      instructions: {
        // 1. Background: Use template_id (1-5) for rotating backgrounds
        // 2. Audio: Overlay voice-over audio from audio_url
        // 3. Captions: Display captions with word-by-word highlighting
        //    - Each word highlights as it's spoken (yellow background)
        //    - Use FFmpeg ASS format for styling
        // 4. Countdown: When script says "[COUNTDOWN: 5...4...3...2...1]"
        //    - Display question_statement on screen
        //    - Show options if available
        //    - Animate countdown timer: 5, 4, 3, 2, 1
        // 5. Answer Reveal: After countdown
        //    - Display answer with green checkmark
        //    - Show solution text
        // 6. Export: Render as MP4 (1080p, 30fps)
      }
    };

    // Call Python backend video renderer if available
    const pythonBackendUrl = Deno.env.get('PYTHON_BACKEND_URL');

    let videoUrl;
    let renderMessage = '';

    if (pythonBackendUrl) {
      try {
        const renderResponse = await fetch(`${pythonBackendUrl}/render`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(renderSpec),
          signal: AbortSignal.timeout(300000) // 5 minute timeout
        });

        if (renderResponse.ok) {
          const result = await renderResponse.json();
          videoUrl = result.video_url;
          renderMessage = 'Video rendered successfully by Python backend';
        } else {
          const errorText = await renderResponse.text();
          console.error('Python backend render failed:', errorText);
          throw new Error(`Python backend render failed: ${errorText}`);
        }
      } catch (error) {
        console.error('Python backend error:', error);
        // Generate mock URL as fallback
        videoUrl = `${supabaseUrl}/storage/v1/object/public/video-renders/video_${video_id}_template_${template_id}.mp4`;
        renderMessage = 'Python backend unavailable. Mock URL generated. Video will need manual rendering.';
      }
    } else {
      // For demonstration, generate a mock video URL
      videoUrl = `${supabaseUrl}/storage/v1/object/public/video-renders/video_${video_id}_template_${template_id}.mp4`;
      renderMessage = 'PYTHON_BACKEND_URL not configured. Please set up Python backend for actual video rendering. Mock URL generated for testing.';
    }

    return new Response(
      JSON.stringify({
        success: true,
        video_url: videoUrl,
        message: renderMessage,
        has_python_backend: !!pythonBackendUrl,
        render_spec: renderSpec
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        }
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        }
      }
    );
  }
});