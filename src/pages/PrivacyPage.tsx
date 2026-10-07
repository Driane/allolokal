import React from 'react';
import LegalLayout from '../components/LegalLayout';
import SEO from '../components/SEO';

const sections = [
  { id: 'responsable',   title: '1. Responsable du traitement' },
  { id: 'donnees',       title: '2. Données collectées' },
  { id: 'finalites',     title: '3. Finalités & bases légales' },
  { id: 'destinataires', title: '4. Destinataires' },
  { id: 'conservation',  title: '5. Durée de conservation' },
  { id: 'droits',        title: '6. Vos droits (RGPD)' },
  { id: 'cookies',       title: '7. Cookies' },
  { id: 'securite',      title: '8. Sécurité' },
  { id: 'mineurs',       title: '9. Mineurs' },
  { id: 'transferts',    title: '10. Transferts internationaux' },
  { id: 'modifications', title: '11. Modifications' },
  { id: 'contact',       title: '12. Contact & DPO' },
];

const PrivacyPage: React.FC = () => (
  <LegalLayout title="Politique de confidentialité" lastUpdated="1er juin 2026" sections={sections}>
    <SEO title="Politique de confidentialité" url="/privacy" noindex />

    <p>
      AlloLokal accorde une importance primordiale à la protection de vos données personnelles.
      La présente Politique de confidentialité décrit la manière dont nous collectons, utilisons
      et protégeons vos données, conformément au Règlement Général sur la Protection des Données
      (RGPD — Règlement UE 2016/679) et à la loi croate sur la protection des données personnelles
      (ZZOP).
    </p>

    <h2 id="responsable">1. Responsable du traitement</h2>
    <p>
      Le responsable du traitement de vos données personnelles est :{' '}
      <strong><span className="placeholder">[NOM DE LA SOCIÉTÉ]</span></strong>, société de droit croate,
      dont le siège social est situé <span className="placeholder">[ADRESSE COMPLÈTE]</span>,
      OIB : <span className="placeholder">[OIB]</span>.
    </p>
    <p>
      Pour toute question relative à vos données personnelles, vous pouvez nous contacter à :{' '}
      <strong><span className="placeholder">[EMAIL CONTACT RGPD]</span></strong>
    </p>

    <h2 id="donnees">2. Données collectées</h2>
    <h3>2.1 Données que vous nous fournissez directement</h3>
    <ul>
      <li><strong>Données d'identification :</strong> prénom, nom, adresse email, mot de passe (chiffré).</li>
      <li><strong>Données de profil :</strong> photo de profil, bio, localisation, numéro de téléphone, langues parlées, portfolio.</li>
      <li><strong>Données professionnelles (Pros) :</strong> nom de l'entreprise, numéro IBAN/bancaire (via Stripe), qualifications, certifications.</li>
      <li><strong>Données de réservation :</strong> historique des réservations, notes et photos partagées avec les Pros.</li>
      <li><strong>Avis et évaluations :</strong> notes et commentaires laissés après une prestation.</li>
    </ul>
    <h3>2.2 Données collectées automatiquement</h3>
    <ul>
      <li><strong>Données de navigation :</strong> adresse IP, type de navigateur, pages visitées, durée de visite.</li>
      <li><strong>Données de géolocalisation :</strong> uniquement si vous activez la fonctionnalité de géolocalisation, avec votre consentement explicite.</li>
      <li><strong>Cookies :</strong> voir section 7 ci-dessous.</li>
    </ul>

    <h2 id="finalites">3. Finalités et bases légales du traitement</h2>
    <p>Nous traitons vos données personnelles pour les finalités suivantes :</p>
    <ul>
      <li>
        <strong>Exécution du contrat (Art. 6.1.b RGPD) :</strong> création et gestion de votre compte,
        traitement des réservations, paiements, communications liées aux prestations.
      </li>
      <li>
        <strong>Intérêt légitime (Art. 6.1.f RGPD) :</strong> prévention de la fraude, amélioration
        de la Plateforme, sécurité informatique, statistiques anonymisées.
      </li>
      <li>
        <strong>Consentement (Art. 6.1.a RGPD) :</strong> envoi de communications marketing,
        utilisation de cookies non essentiels, géolocalisation.
      </li>
      <li>
        <strong>Obligation légale (Art. 6.1.c RGPD) :</strong> conservation des données de
        facturation, conformité fiscale.
      </li>
    </ul>

    <h2 id="destinataires">4. Destinataires des données</h2>
    <p>Vos données peuvent être partagées avec :</p>
    <ul>
      <li>
        <strong>Les Pros / Clients :</strong> les informations nécessaires à l'exécution du service
        (nom, localisation approximative, note pour le Pro).
      </li>
      <li>
        <strong>Stripe Inc. :</strong> pour le traitement sécurisé des paiements. Stripe est certifié
        PCI-DSS niveau 1. Politique : <a href="https://stripe.com/privacy" target="_blank" rel="noopener noreferrer">stripe.com/privacy</a>.
      </li>
      <li>
        <strong>Supabase Inc. :</strong> hébergement de la base de données et authentification.
        Vos données sont stockées sur des serveurs en Union Européenne.
      </li>
      <li>
        <strong>Autorités compétentes :</strong> uniquement sur réquisition judiciaire ou légale.
      </li>
    </ul>
    <p>Nous ne vendons jamais vos données personnelles à des tiers.</p>

    <h2 id="conservation">5. Durée de conservation</h2>
    <ul>
      <li><strong>Données de compte actif :</strong> pendant toute la durée de votre inscription + 3 ans après désactivation.</li>
      <li><strong>Données de facturation :</strong> 10 ans (obligation légale comptable).</li>
      <li><strong>Avis et évaluations :</strong> 5 ans.</li>
      <li><strong>Logs de connexion :</strong> 12 mois.</li>
      <li><strong>Cookies :</strong> voir section 7.</li>
    </ul>

    <h2 id="droits">6. Vos droits (RGPD)</h2>
    <p>Conformément au RGPD, vous disposez des droits suivants :</p>
    <ul>
      <li><strong>Droit d'accès (Art. 15) :</strong> obtenir une copie de vos données.</li>
      <li><strong>Droit de rectification (Art. 16) :</strong> corriger des données inexactes.</li>
      <li><strong>Droit à l'effacement (Art. 17) :</strong> demander la suppression de vos données (« droit à l'oubli »).</li>
      <li><strong>Droit à la portabilité (Art. 20) :</strong> recevoir vos données dans un format structuré.</li>
      <li><strong>Droit d'opposition (Art. 21) :</strong> vous opposer au traitement à des fins marketing.</li>
      <li><strong>Droit à la limitation (Art. 18) :</strong> limiter le traitement de vos données.</li>
      <li><strong>Droit de retirer votre consentement :</strong> à tout moment, sans affecter la licéité des traitements antérieurs.</li>
    </ul>
    <p>
      Pour exercer ces droits, contactez-nous à <span className="placeholder">[EMAIL RGPD]</span>.
      Nous répondrons dans un délai d'un mois. Vous avez également le droit d'introduire une
      réclamation auprès de l'Agence croate pour la protection des données personnelles (AZOP) à
      l'adresse <a href="https://azop.hr" target="_blank" rel="noopener noreferrer">azop.hr</a>.
    </p>

    <h2 id="cookies">7. Cookies</h2>
    <h3>7.1 Cookies essentiels</h3>
    <p>
      Ces cookies sont indispensables au fonctionnement de la Plateforme (authentification,
      session, préférences de langue et de thème). Ils ne nécessitent pas votre consentement.
      Durée : session ou jusqu'à 1 an.
    </p>
    <h3>7.2 Cookies analytiques</h3>
    <p>
      Ces cookies nous permettent de comprendre comment vous utilisez la Plateforme
      (pages visitées, durée de session) afin d'améliorer nos services. Ils ne sont déposés
      qu'avec votre consentement. Durée : 13 mois.
    </p>
    <h3>7.3 Gestion des cookies</h3>
    <p>
      Vous pouvez gérer vos préférences de cookies à tout moment via le panneau de préférences
      accessible depuis le bandeau cookies ou depuis les paramètres de votre navigateur.
    </p>

    <h2 id="securite">8. Sécurité</h2>
    <p>
      AlloLokal met en œuvre des mesures techniques et organisationnelles appropriées pour protéger
      vos données contre tout accès non autorisé, perte, altération ou divulgation, notamment :
    </p>
    <ul>
      <li>Chiffrement des mots de passe (bcrypt).</li>
      <li>Connexions chiffrées via HTTPS/TLS.</li>
      <li>Accès aux données limité aux seules personnes habilitées.</li>
      <li>Authentification à facteurs multiples pour les accès administrateurs.</li>
    </ul>
    <p>
      En cas de violation de données susceptible d'engendrer un risque pour vos droits et libertés,
      nous vous en informerons dans les meilleurs délais conformément à l'Art. 34 RGPD.
    </p>

    <h2 id="mineurs">9. Mineurs</h2>
    <p>
      La Plateforme est réservée aux personnes âgées de 18 ans et plus. Nous ne collectons pas
      sciemment de données personnelles relatives à des mineurs. Si vous pensez qu'un mineur a
      créé un compte, contactez-nous afin que nous puissions supprimer ces données.
    </p>

    <h2 id="transferts">10. Transferts internationaux de données</h2>
    <p>
      Certains de nos prestataires techniques (Stripe, Supabase) sont établis hors de l'Union
      Européenne ou y transfèrent des données. Ces transferts sont encadrés par des garanties
      appropriées, notamment les Clauses Contractuelles Types de la Commission européenne ou le
      cadre adéquat reconnu par la Commission.
    </p>

    <h2 id="modifications">11. Modifications de la présente politique</h2>
    <p>
      Nous pouvons modifier la présente Politique de confidentialité à tout moment. Toute
      modification substantielle vous sera notifiée par email ou via une bannière sur la Plateforme,
      au moins 30 jours avant son entrée en vigueur. La date de dernière mise à jour est indiquée
      en haut de cette page.
    </p>

    <h2 id="contact">12. Contact et Délégué à la Protection des Données</h2>
    <p>
      Pour toute question concernant cette politique ou l'exercice de vos droits :{' '}
      <strong><span className="placeholder">[EMAIL RGPD]</span></strong>
    </p>
    <p>
      <span className="placeholder">[NOM DE LA SOCIÉTÉ]</span><br />
      À l'attention du Délégué à la Protection des Données<br />
      <span className="placeholder">[ADRESSE POSTALE]</span><br />
      Croatie
    </p>

  </LegalLayout>
);

export default PrivacyPage;
