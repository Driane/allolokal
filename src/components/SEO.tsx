import React from 'react';
import { Helmet } from 'react-helmet-async';

const SITE_URL  = 'https://allolokal.com';
const SITE_NAME = 'AlloLokal';
const DEFAULT_IMAGE = `${SITE_URL}/og-image.jpg`;

interface SEOProps {
  title?: string;         // Titre de la page (sans " — AlloLokal")
  description?: string;
  image?: string;
  url?: string;
  type?: 'website' | 'profile' | 'article';
  noindex?: boolean;
}

const SEO: React.FC<SEOProps> = ({
  title,
  description = 'Trouvez et réservez des professionnels qualifiés près de chez vous en quelques clics — beauté, ménage, bien-être, jardinage et plus.',
  image = DEFAULT_IMAGE,
  url,
  type = 'website',
  noindex = false,
}) => {
  const fullTitle = title ? `${title} — ${SITE_NAME}` : `${SITE_NAME} — Services à domicile en Croatie`;
  const canonical = url ? `${SITE_URL}${url}` : SITE_URL;

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description"      content={description} />
      <meta name="robots"           content={noindex ? 'noindex, nofollow' : 'index, follow'} />
      <link rel="canonical"         href={canonical} />

      {/* Open Graph */}
      <meta property="og:type"        content={type} />
      <meta property="og:site_name"   content={SITE_NAME} />
      <meta property="og:title"       content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image"       content={image} />
      <meta property="og:url"         content={canonical} />

      {/* Twitter Card */}
      <meta name="twitter:card"        content="summary_large_image" />
      <meta name="twitter:title"       content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image"       content={image} />
    </Helmet>
  );
};

export default SEO;
