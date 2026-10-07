import React from 'react';
import LegalLayout from '../components/LegalLayout';
import SEO from '../components/SEO';

const sections = [
  { id: 'objet',         title: '1. Objet' },
  { id: 'definitions',   title: '2. Définitions' },
  { id: 'inscription',   title: '3. Inscription' },
  { id: 'fonctionnement',title: '4. Fonctionnement' },
  { id: 'reservations',  title: '5. Réservations & paiements' },
  { id: 'commissions',   title: '6. Commissions' },
  { id: 'annulations',   title: '7. Annulations & remboursements' },
  { id: 'obligations',   title: '8. Obligations des parties' },
  { id: 'responsabilite',title: '9. Responsabilité' },
  { id: 'pi',            title: '10. Propriété intellectuelle' },
  { id: 'donnees',       title: '11. Données personnelles' },
  { id: 'modifications', title: '12. Modifications' },
  { id: 'litiges',       title: '13. Litiges & droit applicable' },
];

const TermsPage: React.FC = () => (
  <LegalLayout title="Conditions générales d'utilisation" lastUpdated="1er juin 2026" sections={sections}>
    <SEO title="Conditions générales d'utilisation" url="/terms" noindex />

    <h2 id="objet">1. Objet</h2>
    <p>
      Les présentes Conditions Générales d'Utilisation (ci-après « CGU ») régissent l'accès et
      l'utilisation de la plateforme AlloLokal (ci-après « la Plateforme »), éditée par{' '}
      <span className="placeholder">[NOM DE LA SOCIÉTÉ]</span>, société de droit croate dont le siège social
      est situé <span className="placeholder">[ADRESSE COMPLÈTE]</span>, immatriculée sous le numéro OIB{' '}
      <span className="placeholder">[OIB]</span>.
    </p>
    <p>
      AlloLokal est une place de marché de services à domicile mettant en relation des prestataires
      professionnels (ci-après « Pros ») et des particuliers souhaitant réserver ces services
      (ci-après « Clients »). La Plateforme n'est pas prestataire des services proposés ; elle
      agit en qualité d'intermédiaire technique.
    </p>
    <p>
      Toute utilisation de la Plateforme implique l'acceptation pleine et entière des présentes CGU.
      Si vous n'acceptez pas ces conditions, veuillez ne pas utiliser la Plateforme.
    </p>

    <h2 id="definitions">2. Définitions</h2>
    <ul>
      <li><strong>Plateforme :</strong> le site web et les services accessibles à l'adresse allolokal.com.</li>
      <li><strong>Pro / Prestataire :</strong> tout professionnel inscrit sur la Plateforme proposant des services.</li>
      <li><strong>Client :</strong> tout utilisateur réservant un service via la Plateforme.</li>
      <li><strong>Service :</strong> toute prestation proposée par un Pro sur la Plateforme.</li>
      <li><strong>Réservation :</strong> la commande ferme d'un Service par un Client.</li>
      <li><strong>Commission :</strong> la rémunération perçue par AlloLokal sur chaque transaction.</li>
    </ul>

    <h2 id="inscription">3. Inscription et compte utilisateur</h2>
    <h3>3.1 Conditions d'inscription</h3>
    <p>
      L'inscription est ouverte à toute personne physique majeure (18 ans ou plus) ou morale disposant
      de la capacité juridique. Les mineurs ne sont pas autorisés à créer un compte.
    </p>
    <h3>3.2 Création du compte</h3>
    <p>
      L'utilisateur s'engage à fournir des informations exactes, complètes et à jour lors de son
      inscription. Il est responsable de la confidentialité de ses identifiants et de toutes les
      actions effectuées depuis son compte.
    </p>
    <h3>3.3 Vérification des Pros</h3>
    <p>
      Les prestataires s'engagent à fournir des informations véridiques sur leurs compétences,
      qualifications et disponibilités. AlloLokal se réserve le droit de suspendre ou supprimer tout
      compte dont les informations s'avèrent inexactes ou frauduleuses.
    </p>
    <h3>3.4 Résiliation du compte</h3>
    <p>
      L'utilisateur peut supprimer son compte à tout moment depuis les paramètres de son profil.
      AlloLokal se réserve le droit de suspendre ou supprimer tout compte en cas de violation des
      présentes CGU, sans préavis ni remboursement.
    </p>

    <h2 id="fonctionnement">4. Fonctionnement de la Plateforme</h2>
    <p>
      AlloLokal met à disposition une Plateforme permettant aux Clients de rechercher des Pros,
      de consulter leurs profils et portfolios, de réserver leurs services et d'effectuer le paiement
      en ligne de manière sécurisée.
    </p>
    <p>
      AlloLokal n'emploie pas les Pros et n'est pas responsable de la qualité, de la légalité ou de
      l'exécution des services proposés. Les Pros exercent leur activité de manière indépendante
      et sont seuls responsables de la bonne exécution de leurs prestations.
    </p>

    <h2 id="reservations">5. Réservations et paiements</h2>
    <h3>5.1 Processus de réservation</h3>
    <p>
      Le Client sélectionne un Service, choisit une date et un créneau horaire disponibles, puis
      confirme sa réservation via le tunnel de paiement sécurisé. La réservation est confirmée
      après validation du paiement.
    </p>
    <h3>5.2 Paiements</h3>
    <p>
      Les paiements sont traités par <strong>Stripe</strong>, prestataire de services de paiement
      certifié PCI-DSS. AlloLokal ne stocke aucune donnée bancaire. Le montant total est débité au
      moment de la réservation et reversé au Pro après déduction de la commission AlloLokal, dans
      les délais définis par Stripe Connect.
    </p>
    <h3>5.3 Confirmation</h3>
    <p>
      Le Pro dispose d'un délai de 24 heures pour confirmer ou refuser la réservation. En cas de
      refus ou d'absence de réponse, le Client est remboursé intégralement.
    </p>

    <h2 id="commissions">6. Commissions et tarifs</h2>
    <p>
      AlloLokal perçoit une commission sur chaque transaction réalisée via la Plateforme. Les taux
      applicables sont :
    </p>
    <ul>
      <li><strong>Commission nouveau client :</strong> 14% du montant HT de la prestation</li>
      <li><strong>Commission client fidèle :</strong> 9% du montant HT de la prestation</li>
    </ul>
    <p>
      La TVA croate (PDV) au taux de 25% est applicable sur les commissions facturées aux Pros
      établis en Croatie, conformément à la législation fiscale en vigueur.
    </p>
    <p>
      Ces tarifs sont susceptibles d'évoluer. Tout changement de commission sera notifié aux Pros
      avec un préavis d'au moins 30 jours.
    </p>

    <h2 id="annulations">7. Annulations et remboursements</h2>
    <h3>7.1 Annulation par le Client</h3>
    <ul>
      <li><strong>Plus de 48h avant la prestation :</strong> remboursement intégral.</li>
      <li><strong>Entre 24h et 48h avant :</strong> remboursement à 50%.</li>
      <li><strong>Moins de 24h avant :</strong> aucun remboursement.</li>
    </ul>
    <h3>7.2 Annulation par le Pro</h3>
    <p>
      En cas d'annulation par le Pro, quelle qu'en soit la raison, le Client est remboursé
      intégralement. Des annulations répétées de la part d'un Pro peuvent entraîner la suspension
      de son compte.
    </p>
    <h3>7.3 Litiges sur la qualité</h3>
    <p>
      En cas d'insatisfaction, le Client dispose d'un délai de 48 heures après la prestation pour
      signaler un litige via la Plateforme. AlloLokal examinera le litige et se réserve le droit
      de procéder à un remboursement partiel ou total à sa discrétion.
    </p>

    <h2 id="obligations">8. Obligations des parties</h2>
    <h3>8.1 Obligations des Pros</h3>
    <ul>
      <li>Exercer leur activité en conformité avec la législation croate et européenne applicable.</li>
      <li>Détenir toutes les autorisations, certifications et assurances professionnelles requises.</li>
      <li>Honorer les réservations confirmées, respecter les horaires convenus.</li>
      <li>Maintenir à jour leurs disponibilités sur la Plateforme.</li>
      <li>Traiter les Clients avec respect et professionnalisme.</li>
      <li>Ne pas solliciter les Clients en dehors de la Plateforme pour contourner les commissions.</li>
    </ul>
    <h3>8.2 Obligations des Clients</h3>
    <ul>
      <li>Fournir toutes les informations nécessaires à la bonne exécution du service.</li>
      <li>Être présent ou disponible à l'heure et au lieu convenus.</li>
      <li>Traiter les Pros avec respect.</li>
      <li>Effectuer les paiements via la Plateforme uniquement.</li>
      <li>Laisser des avis honnêtes et conformes à la réalité de leur expérience.</li>
    </ul>

    <h2 id="responsabilite">9. Responsabilité</h2>
    <p>
      AlloLokal agit en qualité d'intermédiaire technique et ne peut être tenu responsable de :
    </p>
    <ul>
      <li>La qualité, la conformité ou la sécurité des services fournis par les Pros.</li>
      <li>Tout dommage corporel, matériel ou immatériel survenu lors ou à la suite d'une prestation.</li>
      <li>L'inexactitude des informations communiquées par les utilisateurs.</li>
      <li>Les interruptions ou défaillances techniques de la Plateforme.</li>
    </ul>
    <p>
      La responsabilité de AlloLokal est limitée au montant des commissions perçues sur la
      transaction concernée. AlloLokal ne pourra être tenu responsable de dommages indirects,
      consécutifs ou punitifs.
    </p>

    <h2 id="pi">10. Propriété intellectuelle</h2>
    <p>
      L'ensemble des éléments composant la Plateforme (logo, design, code, contenus textuels,
      photographies, etc.) sont la propriété exclusive de AlloLokal ou de ses partenaires et sont
      protégés par les lois relatives à la propriété intellectuelle.
    </p>
    <p>
      Les utilisateurs concèdent à AlloLokal une licence non exclusive, mondiale et gratuite pour
      utiliser, reproduire et afficher les contenus qu'ils publient sur la Plateforme
      (photos de portfolio, descriptions de services, avis) dans le cadre du fonctionnement
      et de la promotion de la Plateforme.
    </p>

    <h2 id="donnees">11. Données personnelles</h2>
    <p>
      Le traitement des données personnelles des utilisateurs est régi par notre{' '}
      <a href="/privacy">Politique de confidentialité</a>, conforme au Règlement Général sur la
      Protection des Données (RGPD — Règlement UE 2016/679) et à la loi croate sur la protection
      des données personnelles.
    </p>

    <h2 id="modifications">12. Modifications des CGU</h2>
    <p>
      AlloLokal se réserve le droit de modifier les présentes CGU à tout moment. Les utilisateurs
      seront informés de toute modification substantielle par email ou via une notification sur
      la Plateforme, avec un préavis d'au moins 30 jours. La poursuite de l'utilisation de la
      Plateforme après ce délai vaut acceptation des nouvelles CGU.
    </p>

    <h2 id="litiges">13. Litiges et droit applicable</h2>
    <p>
      Les présentes CGU sont soumises au droit croate. En cas de litige relatif à l'interprétation
      ou à l'exécution des présentes, les parties s'engagent à rechercher une solution amiable
      avant tout recours judiciaire.
    </p>
    <p>
      À défaut d'accord amiable, tout litige sera soumis à la compétence exclusive des tribunaux
      compétents de <span className="placeholder">[VILLE, CROATIE]</span>.
    </p>
    <p>
      Conformément au Règlement (UE) n°524/2013, les consommateurs de l'UE peuvent également
      recourir à la plateforme de résolution en ligne des litiges accessible à l'adresse :{' '}
      <a href="https://ec.europa.eu/consumers/odr" target="_blank" rel="noopener noreferrer">
        ec.europa.eu/consumers/odr
      </a>.
    </p>

  </LegalLayout>
);

export default TermsPage;
