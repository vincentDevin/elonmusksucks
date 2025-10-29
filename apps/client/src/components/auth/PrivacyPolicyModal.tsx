import { XMarkIcon } from '@heroicons/react/24/outline';

interface PrivacyPolicyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function PrivacyPolicyModal({ isOpen, onClose }: PrivacyPolicyModalProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-surface rounded-lg shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-y-auto text-content"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-surface border-b border-border p-6 flex items-center justify-between">
          <h2 className="text-2xl font-bold">Privacy Policy</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-background rounded-lg transition-colors"
            aria-label="Close modal"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>
        <div className="p-6 space-y-4 text-sm">
          <section>
            <h3 className="text-lg font-semibold mb-2">About This Site</h3>
            <p className="text-tertiary">
              ElonMuskSucks.net is a satirical prediction market platform making fun of Elon Musk
              and other billionaires. We take your privacy seriously despite our tongue-in-cheek
              approach to everything else.
            </p>
          </section>

          <section>
            <h3 className="text-lg font-semibold mb-2">1. What We Collect</h3>
            <p className="text-tertiary mb-2">We collect only what's necessary to run the site:</p>
            <ul className="list-disc list-inside text-tertiary ml-4 space-y-1">
              <li>Account information (name, email address, password)</li>
              <li>Profile data (bio, location, avatar - all optional)</li>
              <li>Platform activity (predictions, bets, game scores, chat messages)</li>
              <li>Technical data (IP address, device info for security purposes)</li>
            </ul>
          </section>

          <section>
            <h3 className="text-lg font-semibold mb-2">2. How We Use Your Data</h3>
            <p className="text-tertiary mb-2">
              Your information is used exclusively for site functionality:
            </p>
            <ul className="list-disc list-inside text-tertiary ml-4 space-y-1">
              <li>Providing core features (authentication, leaderboards, predictions)</li>
              <li>Maintaining game integrity and preventing abuse</li>
              <li>Technical support and bug fixes</li>
              <li>Detecting and preventing illegal activity</li>
            </ul>
            <p className="text-tertiary mt-2 font-semibold">
              We do NOT use your data for advertising, marketing, or any other commercial purposes.
            </p>
          </section>

          <section>
            <h3 className="text-lg font-semibold mb-2">3. We Never Share Your Data</h3>
            <p className="text-tertiary mb-2">
              <strong>Period.</strong> We do not sell, trade, rent, or share your personal
              information with third parties. Ever.
            </p>
            <p className="text-tertiary mb-2">The only exceptions are:</p>
            <ul className="list-disc list-inside text-tertiary ml-4 space-y-1">
              <li>When required by law (court orders, legal investigations)</li>
              <li>To report illegal activity to authorities</li>
              <li>To ban users engaged in illegal behavior</li>
            </ul>
            <p className="text-tertiary mt-2">
              That's it. No data brokers, no advertisers, no shady third parties.
            </p>
          </section>

          <section>
            <h3 className="text-lg font-semibold mb-2">4. Cookies</h3>
            <p className="text-tertiary">
              We use exactly two types of cookies, both essential for site functionality:
            </p>
            <ul className="list-disc list-inside text-tertiary ml-4 mt-2 space-y-1">
              <li>
                <strong>Session Token:</strong> HTTP-only cookie for authentication (can't be
                accessed by JavaScript)
              </li>
              <li>
                <strong>Refresh Token:</strong> Standard cookie to keep you logged in
              </li>
            </ul>
            <p className="text-tertiary mt-2">
              No tracking cookies. No analytics cookies. No advertising cookies. Just the bare
              minimum to keep you authenticated.
            </p>
          </section>

          <section>
            <h3 className="text-lg font-semibold mb-2">5. Data Security</h3>
            <p className="text-tertiary">
              We implement industry-standard security measures including password hashing, encrypted
              connections, and secure database storage. While no system is 100% secure, we do
              everything reasonable to protect your data.
            </p>
          </section>

          <section>
            <h3 className="text-lg font-semibold mb-2">6. Your Rights</h3>
            <p className="text-tertiary mb-2">You have the right to:</p>
            <ul className="list-disc list-inside text-tertiary ml-4 space-y-1">
              <li>Access your personal information</li>
              <li>Update or correct your data</li>
              <li>Request account deletion</li>
              <li>Export your data</li>
            </ul>
            <p className="text-tertiary mt-2">
              Contact us through the platform to exercise these rights.
            </p>
          </section>

          <section>
            <h3 className="text-lg font-semibold mb-2">7. Age Restriction</h3>
            <p className="text-tertiary">
              <strong>You must be 18 years or older to use this site.</strong> We do not knowingly
              collect information from anyone under 18. If you're a parent and discover your child
              has created an account, contact us immediately and we'll delete it.
            </p>
            <p className="text-tertiary mt-2">
              Age verification is the responsibility of users and parents. We are not liable for
              minors who misrepresent their age.
            </p>
          </section>

          <section>
            <h3 className="text-lg font-semibold mb-2">8. Data Retention</h3>
            <p className="text-tertiary">
              We keep your data for as long as your account is active. If you delete your account,
              we'll remove your personal information (though we may retain anonymized data for
              platform statistics).
            </p>
            <p className="text-tertiary mt-2">
              Exception: If you've been banned for illegal activity, we'll retain your IP address,
              device information, and relevant logs indefinitely for security purposes.
            </p>
          </section>

          <section>
            <h3 className="text-lg font-semibold mb-2">9. Changes to This Policy</h3>
            <p className="text-tertiary">
              We may update this Privacy Policy. Changes will be posted on this page with an updated
              date. Continued use of the site after changes constitutes acceptance.
            </p>
          </section>

          <section>
            <h3 className="text-lg font-semibold mb-2">10. Questions?</h3>
            <p className="text-tertiary">
              Contact us through the platform if you have questions about this Privacy Policy.
            </p>
          </section>

          <p className="text-tertiary text-xs mt-6 pt-4 border-t border-border">
            Last updated: October 2025
          </p>
        </div>
      </div>
    </div>
  );
}
