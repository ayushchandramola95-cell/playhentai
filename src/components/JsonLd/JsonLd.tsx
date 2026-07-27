import React from 'react';

interface JsonLdProps {
  data: Record<string, any> | Record<string, any>[];
}

/**
 * Renders one or more JSON-LD structured data blocks.
 * Pass a single schema object or an array of schema objects.
 */
export default function JsonLd({ data }: JsonLdProps) {
  const schemas = Array.isArray(data) ? data : [data];
  return (
    <>
      {schemas.map((schema, i) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
      ))}
    </>
  );
}
