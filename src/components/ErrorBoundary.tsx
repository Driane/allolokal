import React from 'react';

interface State { hasError: boolean; error: Error | null; isReloading: boolean; }
interface Props  { children: React.ReactNode; fallback?: React.ReactNode; }

// Vite/navigateurs renvoient des libellés différents pour un chunk JS devenu introuvable
// (cas typique : nouveau déploiement pendant qu'un onglet était resté ouvert sur l'ancienne version).
const CHUNK_LOAD_ERROR_PATTERNS = [
  'Failed to fetch dynamically imported module',
  'error loading dynamically imported module',
  'Importing a module script failed',
];

const RELOAD_FLAG_KEY = 'allolokal:chunk-reload-at';
const RELOAD_COOLDOWN_MS = 15000;

function isChunkLoadError(error: Error): boolean {
  const msg = error.message || '';
  return CHUNK_LOAD_ERROR_PATTERNS.some(p => msg.includes(p));
}

// Un seul rechargement auto par fenêtre de 15s : si le chunk échoue encore juste après,
// on arrête là et on affiche le fallback manuel plutôt que de boucler indéfiniment.
function shouldAutoReload(): boolean {
  try {
    const last = Number(sessionStorage.getItem(RELOAD_FLAG_KEY) || 0);
    if (Date.now() - last < RELOAD_COOLDOWN_MS) return false;
    sessionStorage.setItem(RELOAD_FLAG_KEY, String(Date.now()));
    return true;
  } catch {
    return true;
  }
}

class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false, error: null, isReloading: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, isReloading: false };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ErrorBoundary]', error, info);

    if (isChunkLoadError(error) && shouldAutoReload()) {
      this.setState({ isReloading: true });
      window.location.reload();
    }
  }

  render() {
    if (this.state.hasError) {
      // Si un fallback personnalisé est fourni (ex: null), l'utiliser silencieusement
      if (this.props.fallback !== undefined) return this.props.fallback;

      // Rechargement auto en cours : écran neutre plutôt que de flasher l'écran d'erreur
      if (this.state.isReloading) {
        return <div style={{ minHeight: '100vh', background: '#0b0e14' }} />;
      }

      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#0b0e14',
          color: '#F0F2F8',
          fontFamily: 'system-ui, sans-serif',
          padding: '2rem',
          textAlign: 'center',
        }}>
          <p style={{ fontSize: '3rem', marginBottom: '1rem' }}>⚠️</p>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 900, marginBottom: '0.5rem' }}>
            Une erreur est survenue
          </h1>
          <p style={{ color: '#8892A4', marginBottom: '2rem', maxWidth: '400px' }}>
            Veuillez rafraîchir la page. Si le problème persiste, contactez le support.
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              background: '#2563EB',
              color: 'white',
              border: 'none',
              borderRadius: '12px',
              padding: '12px 32px',
              fontWeight: 700,
              cursor: 'pointer',
              fontSize: '14px',
            }}
          >
            Rafraîchir la page
          </button>
          {this.state.error && (
            <details style={{ marginTop: '2rem', textAlign: 'left', maxWidth: '600px', width: '100%' }}>
              <summary style={{ cursor: 'pointer', color: '#8892A4', fontSize: '12px', marginBottom: '0.5rem' }}>
                Voir les détails de l'erreur
              </summary>
              <pre style={{ fontSize: '11px', color: '#EF4444', overflow: 'auto', background: '#0d1117', padding: '1rem', borderRadius: '8px', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                {this.state.error.toString()}
                {this.state.error.stack ? '\n\n' + this.state.error.stack : ''}
              </pre>
            </details>
          )}
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
