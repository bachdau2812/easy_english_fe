interface AudioPlayerProps {
  src?: string | null;
}

export const AudioPlayer = ({ src }: AudioPlayerProps) => {
  if (!src) {
    return <span>No audio source is available.</span>;
  }

  return <audio controls src={src} />;
};
