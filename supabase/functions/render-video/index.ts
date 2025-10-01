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

    const { data: video, error: fetchError } = await supabase
      .from('videos')
      .select('*')
      .eq('id', video_id)
      .single();

    if (fetchError || !video) {
      throw new Error('Video record not found');
    }

    const { data: question, error: questionError } = await supabase
      .from('new_questions')
      .select('question_statement, options, answer, solution')
      .eq('id', video.question_id)
      .single();

    if (questionError || !question) {
      throw new Error('Question data not found');
    }

    const renderSpec = {
      video_id: video_id,
      template_id: template_id,
      audio_url: video.audio_url,
      captions: video.captions_data,
      question_data: {
        statement: question.question_statement,
        options: question.options,
        answer: question.answer,
        solution: question.solution
      },
      instructions: {
        background: `Template ${template_id}`,
        audio: 'Overlay voice-over',
        captions: 'Word-by-word highlighting',
        countdown: '5-second question display',
        answer_reveal: 'Green checkmark animation',
        export: 'MP4 1080p 30fps'
      }
    };

    const pythonBackendUrl = Deno.env.get('PYTHON_BACKEND_URL');

    let videoUrl;
    let renderMessage = '';

    if (pythonBackendUrl) {
      try {
        const renderResponse = await fetch(`${pythonBackendUrl}/render`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(renderSpec),
          signal: AbortSignal.timeout(300000)
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
        videoUrl = `${supabaseUrl}/storage/v1/object/public/video-renders/video_${video_id}_template_${template_id}.mp4`;
        renderMessage = 'Python backend unavailable. Mock URL generated. Video will need manual rendering.';
      }
    } else {
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