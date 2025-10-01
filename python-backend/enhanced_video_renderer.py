"""
Enhanced Video Renderer for Educational Content
Renders videos with audio, captions, word-by-word highlighting, and question overlays
"""

import os
import json
import requests
from pathlib import Path
from typing import Dict, List, Any
from moviepy.editor import (
    VideoClip, AudioFileClip, TextClip, CompositeVideoClip,
    ColorClip, ImageClip, concatenate_videoclips
)
from moviepy.video.fx.all import fadein, fadeout
import numpy as np
from PIL import Image, ImageDraw, ImageFont
import tempfile

class EnhancedVideoRenderer:
    def __init__(self, supabase_url: str, supabase_key: str):
        self.supabase_url = supabase_url
        self.supabase_key = supabase_key
        self.temp_dir = tempfile.mkdtemp()

        # Video settings
        self.width = 1080
        self.height = 1920  # Vertical video for social media
        self.fps = 30

        # Template backgrounds (solid colors for now)
        self.templates = {
            1: '#1e3a8a',  # Blue
            2: '#7c3aed',  # Purple
            3: '#059669',  # Green
            4: '#dc2626',  # Red
            5: '#ea580c',  # Orange
        }

    def download_audio(self, audio_url: str) -> str:
        """Download audio file from URL"""
        response = requests.get(audio_url)
        audio_path = os.path.join(self.temp_dir, 'audio.mp3')
        with open(audio_path, 'wb') as f:
            f.write(response.content)
        return audio_path

    def create_background(self, template_id: int, duration: float) -> ColorClip:
        """Create colored background"""
        color = self.templates.get(template_id, self.templates[1])
        # Convert hex to RGB
        color_rgb = tuple(int(color[i:i+2], 16) for i in (1, 3, 5))
        return ColorClip(
            size=(self.width, self.height),
            color=color_rgb,
            duration=duration
        )

    def create_caption_clip(self, caption_data: Dict, video_duration: float) -> List[VideoClip]:
        """Create caption clips with word-by-word highlighting"""
        clips = []

        for caption in caption_data:
            start_time = float(caption['start'])
            end_time = float(caption['end'])
            text = caption['text']
            words = caption.get('words', [])

            # Create base caption clip
            txt_clip = TextClip(
                text,
                fontsize=60,
                color='white',
                font='Arial-Bold',
                stroke_color='black',
                stroke_width=2,
                method='caption',
                size=(self.width - 100, None),
                align='center'
            ).set_position(('center', self.height - 300)).set_duration(end_time - start_time).set_start(start_time)

            clips.append(txt_clip)

            # Add word highlighting (simplified version)
            for word_data in words:
                word_start = float(word_data['start'])
                word_end = float(word_data['end'])
                word_text = word_data['word']

                # Create highlighted word
                highlight_clip = TextClip(
                    word_text,
                    fontsize=60,
                    color='yellow',
                    font='Arial-Bold',
                    stroke_color='black',
                    stroke_width=2
                ).set_position(('center', self.height - 300)).set_duration(word_end - word_start).set_start(word_start)

                clips.append(highlight_clip)

        return clips

    def create_question_overlay(self, question_data: Dict, start_time: float, duration: float = 5.0) -> List[VideoClip]:
        """Create question display with countdown"""
        clips = []

        # Question statement
        question_clip = TextClip(
            question_data['statement'][:200],  # Limit length
            fontsize=50,
            color='white',
            font='Arial-Bold',
            method='caption',
            size=(self.width - 100, None),
            align='center',
            stroke_color='black',
            stroke_width=2
        ).set_position(('center', 200)).set_duration(duration).set_start(start_time)

        clips.append(question_clip)

        # Options (if MCQ)
        if question_data.get('options'):
            options_text = question_data['options']
            options_clip = TextClip(
                options_text[:300],
                fontsize=40,
                color='white',
                font='Arial',
                method='caption',
                size=(self.width - 100, None),
                align='left',
                stroke_color='black',
                stroke_width=1
            ).set_position((50, 500)).set_duration(duration).set_start(start_time)

            clips.append(options_clip)

        # Countdown timer
        for i in range(5, 0, -1):
            countdown_clip = TextClip(
                str(i),
                fontsize=120,
                color='red' if i <= 2 else 'yellow',
                font='Arial-Bold',
                stroke_color='black',
                stroke_width=4
            ).set_position(('center', 'center')).set_duration(1.0).set_start(start_time + (5 - i))

            clips.append(countdown_clip)

        return clips

    def create_answer_reveal(self, answer: str, solution: str, start_time: float, duration: float = 3.0) -> List[VideoClip]:
        """Create answer reveal overlay"""
        clips = []

        # Answer
        answer_clip = TextClip(
            f"Answer: {answer}",
            fontsize=70,
            color='lightgreen',
            font='Arial-Bold',
            stroke_color='black',
            stroke_width=3
        ).set_position(('center', self.height // 2 - 100)).set_duration(duration).set_start(start_time)

        clips.append(answer_clip.crossfadein(0.5))

        return clips

    def render_video(self, render_spec: Dict) -> str:
        """Main rendering function"""
        try:
            # Download audio
            audio_path = self.download_audio(render_spec['audio_url'])
            audio = AudioFileClip(audio_path)
            video_duration = audio.duration

            # Create background
            template_id = render_spec.get('template_id', 1)
            background = self.create_background(template_id, video_duration)

            # Create all video clips
            all_clips = [background]

            # Add captions
            caption_clips = self.create_caption_clip(
                render_spec['captions'],
                video_duration
            )
            all_clips.extend(caption_clips)

            # Detect countdown section in script
            script = render_spec.get('script', '')
            countdown_start = video_duration * 0.4  # Estimate at 40% through

            # Add question overlay
            question_clips = self.create_question_overlay(
                render_spec['question_data'],
                countdown_start,
                5.0
            )
            all_clips.extend(question_clips)

            # Add answer reveal
            answer_clips = self.create_answer_reveal(
                render_spec['question_data']['answer'],
                render_spec['question_data'].get('solution', ''),
                countdown_start + 5.0,
                3.0
            )
            all_clips.extend(answer_clips)

            # Composite all clips
            final_video = CompositeVideoClip(all_clips, size=(self.width, self.height))
            final_video = final_video.set_audio(audio)

            # Output path
            video_id = render_spec['video_id']
            output_path = os.path.join(self.temp_dir, f'video_{video_id}.mp4')

            # Render
            final_video.write_videofile(
                output_path,
                fps=self.fps,
                codec='libx264',
                audio_codec='aac',
                preset='medium',
                threads=4
            )

            # Upload to Supabase Storage
            video_url = self.upload_to_storage(output_path, video_id)

            # Cleanup
            os.remove(audio_path)
            audio.close()
            final_video.close()

            return video_url

        except Exception as e:
            print(f"Error rendering video: {str(e)}")
            raise

    def upload_to_storage(self, file_path: str, video_id: str) -> str:
        """Upload rendered video to Supabase Storage"""
        storage_url = f"{self.supabase_url}/storage/v1/object/videos/rendered_video_{video_id}.mp4"

        with open(file_path, 'rb') as f:
            response = requests.post(
                storage_url,
                files={'file': f},
                headers={
                    'Authorization': f'Bearer {self.supabase_key}',
                    'Content-Type': 'video/mp4'
                }
            )

        if response.status_code in [200, 201]:
            return f"{self.supabase_url}/storage/v1/object/public/videos/rendered_video_{video_id}.mp4"
        else:
            raise Exception(f"Upload failed: {response.text}")


# Flask API for video rendering
from flask import Flask, request, jsonify

app = Flask(__name__)

@app.route('/render', methods=['POST'])
def render_video_endpoint():
    """API endpoint for video rendering"""
    try:
        render_spec = request.json

        supabase_url = os.getenv('SUPABASE_URL')
        supabase_key = os.getenv('SUPABASE_SERVICE_ROLE_KEY')

        renderer = EnhancedVideoRenderer(supabase_url, supabase_key)
        video_url = renderer.render_video(render_spec)

        return jsonify({
            'success': True,
            'video_url': video_url
        })

    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8080)
