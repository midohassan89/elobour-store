import { getNormalizedUrl } from "@/utils/productImage";
import Image from "next/image";

type SafeImageProps = {
  src: string;
  alt: string;
  width: number;
  height: number;
  className?: string;
  priority?: boolean;
};

export default function SafeImage({
  src,
  alt,
  width,
  height,
  className,
  priority = false,
}: SafeImageProps) {
  const imageSrc = getNormalizedUrl(src);

  return (
    <Image
      src={imageSrc}
      alt={alt}
      width={width}
      height={height}
      className={className}
      priority={priority}
      unoptimized
    />
  );
}
