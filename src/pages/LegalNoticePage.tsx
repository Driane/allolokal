import React from 'react';
import LegalLayout from '../components/LegalLayout';
import SEO from '../components/SEO';

const sections = [
  { id: 'editeur',    title: '1. Éditeur du site' },
  { id: 'hebergement',title: '2. Hébergement' },
  { id: 'pi',         title: '3. Propriété intellectuelle' },
  { id: 'liens',      title: '4. Liens hypertextes' },
  { id: 'responsabilite', title: '5. Responsabilité' },
  { id: 'contact',    title: '6. Contact' },
];

const LegalNoticePage: React.FC = () => (
  <LegalLayout title="Mentions légales" lastUpdated="1er juin 2026" sections={sections}>
    <SEO title="Mentions légales" url="/legal" noindex />

    <h2 id="editeur">1. Éditeur du site</h2>
    <p>
      Le site <strong>allolokal.com</strong> est édité par :
    </p>
    <ul>
      <li><strong>Raison sociale :</strong> <span className="placeholder">[NOM DE LA SOCIÉTÉ]</span></li>
      <li><strong>Forme juridique :</strong> <span className="placeholder">[FORME JURIDIQUE — ex : d.o.o. (SARL croate)]</span></li>
      <li><strong>Capital social :</strong> <span className="placeholder">[MONTANT]</span> HRK / EUR</li>
      <li><strong>Siège social :</strong> <span className="placeholder">[ADRESSE COMPLÈTE]</span>, Croatie</li>
      <li><strong>OIB (numéro d'identification fiscale) :</strong> <span className="placeholder">[OIB]</span></li>
      <li><strong>Numéro de registre des sociétés :</strong> <span className="placeholder">[NUMÉRO MBS]</span></li>
      <li><strong>Email :</strong> <span className="placeholder">[EMAIL CONTACT]</span></li>
      <li><strong>Téléphone :</strong> <span className="placeholder">[TÉLÉPHONE]</span></li>
      <li><strong>Directeur de la publication :</strong> <span className="placeholder">[NOM DU DIRIGEANT]</span></li>
    </ul>

    <h2 id="hebergement">2. Hébergement</h2>
    <p>Le site et ses données sont hébergés par :</p>

    <h3>Base de données & authentification</h3>
    <ul>
      <li><strong>Supabase Inc.</strong></li>
      <li>970 Toa Payoh North, Singapore 318992</li>
      <li>Serveurs de données : Union Européenne (Frankfurt, AWS eu-central-1)</li>
      <li><a href="https://supabase.com" target="_blank" rel="noopener noreferrer">supabase.com</a></li>
    </ul>

    <h3>Paiements</h3>
    <ul>
      <li><strong>Stripe Inc.</strong></li>
      <li>510 Townsend Street, San Francisco, CA 94103, États-Unis</li>
      <li><a href="https://stripe.com" target="_blank" rel="noopener noreferrer">stripe.com</a></li>
    </ul>

    <h3>Hébergement frontend</h3>
    <ul>
      <li><strong><span className="placeholder">[NOM DE L'HÉBERGEUR FRONTEND — ex : Vercel, Netlify]</span></strong></li>
      <li><span className="placeholder">[ADRESSE DE L'HÉBERGEUR]</span></li>
    </ul>

    <h2 id="pi">3. Propriété intellectuelle</h2>
    <p>
      L'ensemble des éléments constituant le site AlloLokal — notamment le nom, le logo, la charte
      graphique, les textes, les photographies, les vidéos, les illustrations et le code source —
      sont la propriété exclusive de <span className="placeholder">[NOM DE LA SOCIÉTÉ]</span> ou
      font l'objet de licences dûment obtenues.
    </p>
    <p>
      Toute reproduction, représentation, modification, publication, adaptation ou exploitation de
      tout ou partie de ces éléments, quel qu'en soit le moyen ou le procédé, est interdite sans
      l'autorisation écrite préalable de <span className="placeholder">[NOM DE LA SOCIÉTÉ]</span>.
    </p>
    <p>
      Les marques et logos figurant sur le site sont des marques déposées. Toute reproduction
      sans autorisation est susceptible d'engager la responsabilité civile et pénale du contrefacteur.
    </p>

    <h2 id="liens">4. Liens hypertextes</h2>
    <p>
      Le site AlloLokal peut contenir des liens vers des sites tiers. Ces liens sont fournis à titre
      informatif uniquement. AlloLokal n'assume aucune responsabilité quant au contenu de ces sites
      externes et ne saurait être tenu responsable des dommages résultant de leur consultation.
    </p>
    <p>
      La création de liens hypertextes pointant vers le site AlloLokal est autorisée sans accord
      préalable, sous réserve que ceux-ci ne soient pas utilisés à des fins commerciales ou
      publicitaires et n'induisent pas en erreur sur la nature de notre activité.
    </p>

    <h2 id="responsabilite">5. Limitation de responsabilité</h2>
    <p>
      AlloLokal s'efforce d'assurer l'exactitude et la mise à jour des informations diffusées sur
      ce site, dont il se réserve le droit de corriger le contenu à tout moment et sans préavis.
      Toutefois, AlloLokal ne peut garantir l'exhaustivité ni l'absence d'erreur des informations
      publiées.
    </p>
    <p>
      AlloLokal décline toute responsabilité pour tout dommage direct ou indirect résultant de
      l'utilisation du site ou de l'impossibilité d'y accéder, ainsi que de l'utilisation de
      liens externes.
    </p>

    <h2 id="contact">6. Contact</h2>
    <p>
      Pour toute question, réclamation ou demande d'information, vous pouvez nous contacter :
    </p>
    <ul>
      <li><strong>Par email :</strong> <span className="placeholder">[EMAIL CONTACT]</span></li>
      <li><strong>Par courrier :</strong> <span className="placeholder">[NOM DE LA SOCIÉTÉ]</span>, <span className="placeholder">[ADRESSE]</span>, Croatie</li>
    </ul>
    <p>
      Pour les questions relatives à vos données personnelles, consultez notre{' '}
      <a href="/privacy">Politique de confidentialité</a>.
    </p>

  </LegalLayout>
);

export default LegalNoticePage;
