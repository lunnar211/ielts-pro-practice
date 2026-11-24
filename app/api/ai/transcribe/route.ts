import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";

export const runtime = "nodejs";

const MAX_BYTES = 25 * 1024 * 1024;
const ALLOWED_EXTENSIONS = ["mp3", "wav", "m4a"];

export async function POST(request: NextRequest) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      {
        error: "AI_MARKING_NOT_CONFIGURED",
        message:
          "Audio transcription needs a free Groq key — add GROQ_API_KEY in Vercel env vars.",
      },
      { status: 503 }
    );
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      { error: "INVALID_REQUEST", message: "Expected multipart/form-data with an audio file." },
      { status: 400 }
    );
  }

  const file = formData.get("audio") ?? formData.get("file");
  if (!file || !(file instanceof File)) {
    return NextResponse.json(
      { error: "INVALID_REQUEST", message: "No audio file was uploaded." },
      { status: 400 }
    );
  }
  if (file.size === 0) {
    return NextResponse.json(
      { error: "INVALID_REQUEST", message: "The uploaded audio file is empty." },
      { status: 400 }
    );
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      {
        error: "INVALID_REQUEST",
        message: "Audio file is too large — the maximum is 25 MB.",
      },
      { status: 400 }
    );
  }
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (extension && !ALLOWED_EXTENSIONS.includes(extension)) {
    return NextResponse.json(
      {
        error: "INVALID_REQUEST",
        message: "Unsupported audio format — please upload an mp3, wav or m4a file.",
      },
      { status: 400 }
    );
  }

  try {
    const groq = new Groq({ apiKey });
    // Whisper returns no confidence score — only what the API gives is
    // returned below; nothing is invented.
    const transcription = await groq.audio.transcriptions.create({
      file,
      model: "whisper-large-v3",
      response_format: "verbose_json",
    });
    const response: { transcript: string; durationSeconds?: number } = {
      transcript: transcription.text ?? "",
    };
    const durationValue = (transcription as unknown as Record<string, unknown>)
      .duration;
    if (typeof durationValue === "number") {
      response.durationSeconds = durationValue;
    }
    return NextResponse.json(response);
  } catch (error) {
    const message =
      error && typeof error === "object" && "status" in error
        ? (error as { status?: unknown }).status
        : null;
    if (message === 429) {
      return NextResponse.json(
        {
          error: "AI_QUOTA_EXHAUSTED",
          message:
            "The free AI quota is used up right now — please try again in a few minutes.",
        },
        { status: 429 }
      );
    }
    return NextResponse.json(
      {
        error: "AI_ERROR",
        message:
          "Transcription failed — please check the audio file and try again.",
      },
      { status: 502 }
    );
  }
}
