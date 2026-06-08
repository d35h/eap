import { useState } from 'react';

// An <img> that shows an animated shimmer placeholder while loading and fades in
// once decoded — instead of a blank white box. Carries a neutral background so
// letterboxed (object-fit: contain) images never flash white. Pass through any
// img props (style, width, etc.); className is merged with `smartimg`.
export default function SmartImg({ src, alt = '', className = '', ...rest }) {
  const [loaded, setLoaded] = useState(false);
  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      decoding="async"
      data-loaded={loaded ? '1' : '0'}
      className={`smartimg ${className}`.trim()}
      onLoad={() => setLoaded(true)}
      onError={() => setLoaded(true)}
      {...rest}
    />
  );
}
