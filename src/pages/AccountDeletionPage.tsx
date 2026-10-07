import React from 'react';
import LegalLayout from '../components/LegalLayout';
import SEO from '../components/SEO';

// Page accessible sans connexion, requise par Google Play et Apple App Store
// pour les apps proposant la création de compte.
const sections = [
  { id: 'comment',         title: '1. Comment supprimer mon compte' },
  { id: 'consequences',    title: '2. Conséquences de la suppression' },
  { id: 'donnees',         title: '3. Données conservées après suppression' },
  { id: 'contact',         title: '4. Besoin d\'aide ?' },
];

const AccountDeletionPage: React.FC = () => (
  <LegalLayout title="Suppression de compte" lastUpdated="1er juin 2026" sections={sections}>
    <SEO title="Supprimer mon compte AlloLokal" url="/account-deletion" noindex />

    <h2 id="comment">1. Comment supprimer mon compte</h2>
    <p>
      La suppression de votre compte AlloLokal s'effectue directement depuis l'application
      ou le site web, sans qu'il soit nécessaire de contacter le support.
    </p>
    <h3>Depuis l'application ou le site</h3>
    <ol>
      <li>Connectez-vous à votre compte.</li>
      <li>Accédez à votre profil en cliquant sur votre avatar ou l'onglet <strong>Profil</strong>.</li>
      <li>Ouvrez l'onglet <strong>Gestion</strong>.</li>
      <li>Faites défiler jusqu'à la section <strong>Zone dangereuse</strong>.</li>
      <li>Cliquez sur <strong>Supprimer mon compte</strong> et confirmez en saisissant le mot <strong>SUPPRIMER</strong>.</li>
    </ol>
    <p>
      La suppression est immédiate et définitive. Aucune action de notre part n'est requise.
    </p>

    <h2 id="consequences">2. Conséquences de la suppression</h2>
    <ul>
      <li>Votre accès à la plateforme est révoqué immédiatement.</li>
      <li>Vos informations personnelles (nom, photo, téléphone, localisation, bio) sont anonymisées.</li>
      <li>Vos services et offres publiés sont dépubliés.</li>
      <li>Vos messages et conversations sont supprimés.</li>
      <li>Vous ne recevrez plus aucune communication de notre part.</li>
    </ul>

    <h2 id="donnees">3. Données conservées après suppression</h2>
    <p>
      Conformément à nos obligations légales (traçabilité comptable, litiges en cours),
      certaines données sont conservées de manière anonymisée après la suppression de votre compte :
    </p>
    <ul>
      <li>L'historique de vos réservations (montants, dates, statuts) — conservé de façon anonymisée.</li>
      <li>Votre numéro OIB (identifiant fiscal croate) — conservé pour le reporting fiscal obligatoire
        envers les autorités compétentes, conformément à la réglementation en vigueur.</li>
    </ul>
    <p>
      Ces données ne permettent pas de vous identifier et ne sont accessibles qu'à notre équipe
      dans le cadre strict de nos obligations légales.
    </p>

    <h2 id="contact">4. Besoin d'aide ?</h2>
    <p>
      Si vous rencontrez des difficultés pour supprimer votre compte, ou si vous souhaitez
      faire une demande de suppression sans vous connecter, contactez-nous à l'adresse :
    </p>
    <p>
      <strong><a href="mailto:support@allolokal.com">support@allolokal.com</a></strong>
    </p>
    <p>
      Nous traiterons votre demande dans un délai de 30 jours.
    </p>
  </LegalLayout>
);

export default AccountDeletionPage;
