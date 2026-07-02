import { HelpCircle, Shield, LifeBuoy, FileText } from 'lucide-react';

export const HelpPage = () => {
  return (
    <div className="space-y-6 font-sans max-w-lg">
      <div className="border-b border-neutral-100 pb-4">
        <h3 className="font-display font-bold text-sm text-neutral-800 flex items-center gap-1.5">
          <HelpCircle className="w-4.5 h-4.5 text-ancestral-650" />
          <span>Help & About Platform</span>
        </h3>
        <p className="text-[10px] text-neutral-400 font-light mt-0.5">
          Information about application versions, support desks, and security statements
        </p>
      </div>

      <div className="space-y-4">
        {/* Version block */}
        <div className="bg-white p-5 border border-neutral-150 rounded-3xl space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-neutral-800">Roots Across Generations</span>
            <span className="text-[10px] font-mono bg-neutral-100 text-neutral-500 px-2 py-0.5 rounded">v1.2.0-stable</span>
          </div>
          <p className="text-[10px] text-neutral-400 font-light leading-relaxed">
            Designed as an interactive Family Operating System supporting bulk Excel imports, real-time messaging, timelines, and archives vault.
          </p>
        </div>

        {/* Support resource links */}
        <div className="grid grid-cols-2 gap-4">
          <a
            href="mailto:support@rootsgenerations.com"
            className="bg-white p-4 border border-neutral-150 hover:border-ancestral-300 rounded-3xl text-center space-y-1.5 transition group cursor-pointer block"
          >
            <LifeBuoy className="w-5 h-5 mx-auto text-ancestral-600 group-hover:scale-105 transition" />
            <span className="text-xs font-bold text-neutral-800 block">Support Desk</span>
            <span className="text-[9px] text-neutral-400 font-light block">Get help resolving tree errors</span>
          </a>

          <div
            onClick={() => alert('All databases are encrypted in transit and at rest. Photos are securely hosted on Google Firebase Cloud Buckets.')}
            className="bg-white p-4 border border-neutral-150 hover:border-ancestral-300 rounded-3xl text-center space-y-1.5 transition group cursor-pointer"
          >
            <Shield className="w-5 h-5 mx-auto text-ancestral-600 group-hover:scale-105 transition" />
            <span className="text-xs font-bold text-neutral-800 block">Vault Security</span>
            <span className="text-[9px] text-neutral-400 font-light block">Review profile masking policies</span>
          </div>
        </div>

        {/* Placeholder Policy Sections */}
        <div className="bg-white border border-neutral-150 rounded-3xl divide-y divide-neutral-100 overflow-hidden">
          <div className="p-4 flex items-center justify-between hover:bg-neutral-50/30 transition cursor-pointer" onClick={() => alert('Privacy Policy: We do not share family tree details or media uploads with third-party networks.')}>
            <div className="flex items-center gap-2.5">
              <FileText className="w-4.5 h-4.5 text-neutral-400" />
              <span className="text-xs font-medium text-neutral-700">Privacy Policy Statement</span>
            </div>
            <span className="text-[10px] text-neutral-400">Read</span>
          </div>

          <div className="p-4 flex items-center justify-between hover:bg-neutral-50/30 transition cursor-pointer" onClick={() => alert('Terms of Service: Users must own permissions for media files uploaded to the Archives.')}>
            <div className="flex items-center gap-2.5">
              <FileText className="w-4.5 h-4.5 text-neutral-400" />
              <span className="text-xs font-medium text-neutral-700">Terms of Service Agreement</span>
            </div>
            <span className="text-[10px] text-neutral-400">Read</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HelpPage;
