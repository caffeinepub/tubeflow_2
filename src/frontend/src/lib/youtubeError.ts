interface YouTubeErrorShape {
  error?: {
    code?: number;
    message?: string;
    errors?: Array<{ reason?: string; domain?: string }>;
  };
}

export function parseYouTubeError(data: YouTubeErrorShape): string {
  const err = data.error;
  if (!err) return "Unknown error.";
  const reason = err.errors?.[0]?.reason;
  if (reason === "keyInvalid") {
    return "Invalid API key — double-check in Settings.";
  }
  if (reason === "dailyLimitExceeded" || reason === "quotaExceeded") {
    return "YouTube API quota exceeded. Try again tomorrow.";
  }
  if (reason === "accessNotConfigured") {
    return "YouTube Data API v3 is not enabled. Go to Google Cloud Console → APIs & Services → Enable YouTube Data API v3.";
  }
  if (err.code === 403) {
    return `${err.message ?? "Access denied"} — Check your API key restrictions in Google Cloud Console.`;
  }
  return err.message ?? "YouTube API error.";
}
