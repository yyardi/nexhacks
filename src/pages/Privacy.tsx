import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import charcotLogo from '@/assets/charcot-logo.png';

export default function Privacy() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <Button variant="ghost" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </div>

        <Card>
          <CardHeader className="text-center space-y-4">
            <img src={charcotLogo} alt="Charcot" className="h-12 w-auto mx-auto" />
            <CardTitle className="text-3xl">Privacy Policy</CardTitle>
            <p className="text-sm text-muted-foreground">Last Updated: {new Date().toLocaleDateString()}</p>
          </CardHeader>
          <CardContent className="prose prose-sm max-w-none space-y-6">
            <section>
              <h2 className="text-xl font-semibold mb-3">1. Introduction</h2>
              <p className="text-muted-foreground">
                At Charcot, we are committed to protecting the privacy and security of your data and your patients' information. 
                This Privacy Policy explains how we collect, use, disclose, and safeguard information in compliance with HIPAA 
                and other applicable healthcare privacy regulations.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">2. Information We Collect</h2>
              <div className="space-y-3">
                <div>
                  <h3 className="font-medium text-foreground mb-2">Account Information</h3>
                  <p className="text-muted-foreground">
                    We collect your name, email address, professional credentials, and institution information when you create an account.
                  </p>
                </div>
                <div>
                  <h3 className="font-medium text-foreground mb-2">Clinical Data</h3>
                  <p className="text-muted-foreground">
                    Session transcripts, assessments, diagnoses, treatment plans, and biometric data entered into the platform.
                  </p>
                </div>
                <div>
                  <h3 className="font-medium text-foreground mb-2">Usage Data</h3>
                  <p className="text-muted-foreground">
                    Information about how you use the platform, including access times, features used, and interaction patterns.
                  </p>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">3. How We Use Your Information</h2>
              <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                <li>Provide and improve our clinical decision support services</li>
                <li>Generate psychiatric assessments and treatment recommendations</li>
                <li>Maintain platform security and prevent unauthorized access</li>
                <li>Comply with legal and regulatory requirements</li>
                <li>Communicate important updates about the platform</li>
                <li>Conduct research and analytics to improve AI models (with de-identified data only)</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">4. Data Security</h2>
              <p className="text-muted-foreground mb-3">
                We implement comprehensive security measures to protect your data:
              </p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                <li>End-to-end encryption for data in transit and at rest</li>
                <li>Regular security audits and penetration testing</li>
                <li>Role-based access controls and authentication</li>
                <li>Secure cloud infrastructure with redundant backups</li>
                <li>HIPAA-compliant data storage and handling procedures</li>
                <li>Employee training on data privacy and security protocols</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">5. Data Sharing and Disclosure</h2>
              <p className="text-muted-foreground mb-3">
                We do not sell or rent your personal information. We may share data only in the following circumstances:
              </p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                <li>With your explicit consent</li>
                <li>To comply with legal obligations or court orders</li>
                <li>To prevent harm or protect safety</li>
                <li>With service providers bound by confidentiality agreements</li>
                <li>In connection with a business transaction (merger, acquisition)</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">6. Patient Data Rights</h2>
              <p className="text-muted-foreground">
                As a healthcare professional using Charcot, you are responsible for ensuring patients' rights regarding their 
                health information are protected, including rights to access, amendment, and accounting of disclosures as 
                required by HIPAA.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">7. Data Retention</h2>
              <p className="text-muted-foreground">
                We retain clinical data for as long as necessary to provide services and comply with legal requirements. 
                You may request deletion of specific sessions or your entire account, subject to legal retention obligations.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">8. Your Rights</h2>
              <p className="text-muted-foreground mb-3">You have the right to:</p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                <li>Access your personal and clinical data</li>
                <li>Request corrections to inaccurate information</li>
                <li>Request deletion of your data (subject to legal requirements)</li>
                <li>Export your data in a portable format</li>
                <li>Opt-out of non-essential communications</li>
                <li>Withdraw consent for data processing where applicable</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">9. Third-Party Services</h2>
              <p className="text-muted-foreground">
                We use select third-party services (cloud hosting, analytics) that are HIPAA-compliant and bound by 
                Business Associate Agreements. We carefully vet all partners to ensure they meet our security standards.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">10. Children's Privacy</h2>
              <p className="text-muted-foreground">
                Our platform is not intended for use by individuals under 18 years of age. We do not knowingly collect 
                personal information from children.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">11. International Data Transfers</h2>
              <p className="text-muted-foreground">
                Your data may be processed in countries other than your own. We ensure appropriate safeguards are in place 
                to protect your information in accordance with applicable laws.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">12. Changes to This Policy</h2>
              <p className="text-muted-foreground">
                We may update this Privacy Policy periodically. We will notify you of significant changes via email or 
                platform notification. Continued use after changes constitutes acceptance.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">13. Contact Us</h2>
              <p className="text-muted-foreground">
                For questions about this Privacy Policy or to exercise your rights, contact our Privacy Officer at 
                privacy@charcot.ai or write to us at:
              </p>
              <p className="text-muted-foreground mt-2">
                Charcot Privacy Officer<br />
                [Address]<br />
                [City, State ZIP]
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">14. HIPAA Notice</h2>
              <p className="text-muted-foreground">
                This Privacy Policy is supplemented by our HIPAA Notice of Privacy Practices, available upon request. 
                In the event of any conflict between this policy and HIPAA requirements, HIPAA requirements will prevail.
              </p>
            </section>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
