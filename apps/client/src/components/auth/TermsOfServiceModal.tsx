import React from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';

interface TermsOfServiceModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function TermsOfServiceModal({ isOpen, onClose }: TermsOfServiceModalProps) {
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
          <h2 className="text-2xl font-bold">Terms of Service</h2>
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
              ElonMuskSucks.net is a <strong>satirical</strong> prediction market platform poking
              fun at Elon Musk and other billionaires. This is entertainment, not financial advice.
              By using this site, you acknowledge you understand this is all in good fun (mostly).
            </p>
          </section>

          <section>
            <h3 className="text-lg font-semibold mb-2">1. Acceptance of Terms</h3>
            <p className="text-tertiary">
              By accessing elonmusksucks.net, you agree to these terms. If you don't agree, please
              close this tab and go touch some grass.
            </p>
          </section>

          <section>
            <h3 className="text-lg font-semibold mb-2">2. Age Requirement</h3>
            <p className="text-tertiary">
              <strong>You must be 18 years or older to use this site.</strong> Period. No
              exceptions. Age verification is your responsibility (and your parents' if you're a
              rebellious minor). We are not liable if you lie about your age.
            </p>
          </section>

          <section>
            <h3 className="text-lg font-semibold mb-2">3. Virtual Currency (MuskBucks)</h3>
            <p className="text-tertiary">
              MuskBucks have <strong>ZERO</strong> real-world monetary value. You cannot exchange
              them for actual money. They're imaginary internet points for entertainment purposes
              only. Don't quit your day job.
            </p>
          </section>

          <section>
            <h3 className="text-lg font-semibold mb-2">4. Account Responsibility</h3>
            <p className="text-tertiary">
              You're responsible for your account security. Don't share your password. Don't use
              "password123." Use a password manager like a responsible adult. Any activity under
              your account is your responsibility.
            </p>
          </section>

          <section>
            <h3 className="text-lg font-semibold mb-2">5. Market Manipulation & Gaming</h3>
            <p className="text-tertiary mb-2">
              Here's the deal: You <em>can</em> try to manipulate prediction markets or game the
              system. Go ahead, be creative. <strong>However</strong>, if you get caught:
            </p>
            <ul className="list-disc list-inside text-tertiary ml-4 space-y-1">
              <li>First offense: Temporary ban (duration at our discretion)</li>
              <li>Repeat offense: Permanent ban</li>
              <li>Your username gets immortalized on the Wall of Shame for everyone to mock</li>
              <li>All your MuskBucks go poof (because they were never real anyway)</li>
            </ul>
            <p className="text-tertiary mt-2">
              Play stupid games, win stupid prizes. We're watching. 👀
            </p>
          </section>

          <section>
            <h3 className="text-lg font-semibold mb-2">6. Prohibited Activities</h3>
            <p className="text-tertiary mb-2">You agree NOT to:</p>
            <ul className="list-disc list-inside text-tertiary ml-4 space-y-1">
              <li>Do anything illegal (this should be obvious, but here we are)</li>
              <li>Harass, threaten, or abuse other users</li>
              <li>Post content that violates laws or others' rights</li>
              <li>Create multiple accounts to circumvent bans or limitations</li>
              <li>Use bots or automated tools without permission</li>
              <li>Attempt to hack, DDoS, or otherwise attack our infrastructure</li>
            </ul>
          </section>

          <section>
            <h3 className="text-lg font-semibold mb-2">7. Infrastructure Attacks</h3>
            <p className="text-tertiary mb-2">
              If you attempt malicious attacks on our servers, databases, or infrastructure:
            </p>
            <ul className="list-disc list-inside text-tertiary ml-4 space-y-1">
              <li>We will permanently ban you</li>
              <li>We will save your IP address, device fingerprint, and location data</li>
              <li>We will report you to relevant authorities if warranted</li>
              <li>We may show up at your house (just kidding... or are we? 🏠)</li>
            </ul>
            <p className="text-tertiary mt-2">Don't be that person. We have logs. Lots of logs.</p>
          </section>

          <section>
            <h3 className="text-lg font-semibold mb-2">8. Content Guidelines</h3>
            <p className="text-tertiary">
              Keep it civil. Satire and mockery of billionaires is encouraged, but harassment of
              other users is not. We reserve the right to remove content and ban users who violate
              community standards. Use your brain.
            </p>
          </section>

          <section>
            <h3 className="text-lg font-semibold mb-2">9. Disclaimer</h3>
            <p className="text-tertiary">
              This site is provided "as is" with no warranties. We make no guarantees about uptime,
              accuracy, or anything else. Use at your own risk. We're not responsible for your poor
              betting decisions.
            </p>
          </section>

          <section>
            <h3 className="text-lg font-semibold mb-2">10. Liability Limitation</h3>
            <p className="text-tertiary">
              We are not liable for any damages arising from your use of this site. This includes
              but is not limited to: hurt feelings from losing fake internet money, FOMO from
              missing out on predictions, or rage-quitting after losing at Pong.
            </p>
          </section>

          <section>
            <h3 className="text-lg font-semibold mb-2">11. Changes to Terms</h3>
            <p className="text-tertiary">
              We can update these terms whenever we want. Continued use of the site means you accept
              the new terms. Check back occasionally if you care about this stuff.
            </p>
          </section>

          <section>
            <h3 className="text-lg font-semibold mb-2">12. Questions?</h3>
            <p className="text-tertiary">
              Contact us through the platform if you have questions about these Terms of Service.
            </p>
          </section>

          <p className="text-tertiary text-xs mt-6 pt-4 border-t border-border">
            Last updated: October 2024
          </p>
        </div>
      </div>
    </div>
  );
}
