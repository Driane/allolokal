import React from 'react';
import { APIProvider } from '@vis.gl/react-google-maps';

const MapsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  // version="quarterly" : canal stable de l'API Google Maps — le canal hebdomadaire
  // par défaut a cassé le rendu des AdvancedMarkers (crash getRootNode, v3.65)
  <APIProvider apiKey={import.meta.env.VITE_GOOGLE_MAPS_API_KEY} libraries={['places']} version="quarterly">
    {children}
  </APIProvider>
);

export default MapsProvider;
