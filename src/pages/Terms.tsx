import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import charcotLogo from '@/assets/charcot-logo.png';

export default function Terms() {
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
            <CardTitle className="text-3xl">Terms of Service</CardTitle>
            <p className="text-sm text-muted-foreground">Last Updated: {new Date().toLocaleDateString()}</p>
          </CardHeader>
          <CardContent className="prose prose-sm max-w-none space-y-6">
            <section>
              <h2 className="text-xl font-semibold mb-3">1. Acceptance of Terms</h2>
              <p className="text-muted-foreground">
                By accessing and using Charcot's psychiatric assessment platform, you agree to be bound by these Terms of Service. 
                If you do not agree to these terms, please do not use our services.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">2. Medical Disclaimer</h2>
              <p className="text-muted-foreground">
                Charcot is a clinical decision support tool designed to assist healthcare professionals. It does not replace 
                professional medical judgment, diagnosis, or treatment. All clinical decisions should be made by qualified 
                healthcare professionals based on their professional judgment and patient-specific circumstances.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">3. User Eligibility</h2>
              <p className="text-muted-foreground">
                Our services are intended solely for licensed healthcare professionals, including psychiatrists, psychologists, 
                and licensed clinical mental health professionals. By using Charcot, you represent that you are a licensed 
                healthcare professional authorized to practice in your jurisdiction.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">4. Data Security and HIPAA Compliance</h2>
              <p className="text-muted-foreground">
                Charcot implements industry-standard security measures to protect patient data. Users are responsible for 
                ensuring their use of the platform complies with HIPAA and other applicable healthcare privacy regulations. 
                Do not enter protected health information (PHI) unless you have obtained proper consent and authorization.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">5. User Responsibilities</h2>
              <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                <li>Maintain the confidentiality of your account credentials</li>
                <li>Use the platform only for its intended clinical purposes</li>
                <li>Ensure compliance with all applicable laws and regulations</li>
                <li>Verify all AI-generated recommendations before clinical application</li>
                <li>Report any security concerns or data breaches immediately</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">6. Limitations of Liability</h2>
              <p className="text-muted-foreground">
                Charcot is provided "as is" without warranties of any kind. We are not liable for any clinical decisions 
                made based on platform recommendations. Healthcare professionals retain full responsibility for all patient 
                care decisions.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">7. Intellectual Property</h2>
              <p className="text-muted-foreground">
                All content, algorithms, and materials on Charcot are proprietary and protected by intellectual property laws. 
                Users may not reproduce, distribute, or create derivative works without explicit written permission.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">8. Termination</h2>
              <p className="text-muted-foreground">
                We reserve the right to suspend or terminate accounts that violate these terms or engage in prohibited activities. 
                Users may terminate their accounts at any time by contacting support.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">9. Changes to Terms</h2>
              <p className="text-muted-foreground">
                We may update these Terms of Service periodically. Continued use of the platform after changes constitutes 
                acceptance of the modified terms.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">10. Contact Information</h2>
              <p className="text-muted-foreground">
                For questions about these Terms of Service, please contact us at support@charcot.ai
              </p>
            </section>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
