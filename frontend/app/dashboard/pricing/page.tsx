'use client';

import { useRouter } from 'next/navigation';
import PlanAndPricing from '../../components/PlanAndPricing';

export default function PricingPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-2 sm:px-4 md:px-8">
      <div className="w-full h-auto bg-white/90 rounded-2xl shadow-2xl border border-gray-100 overflow-hidden mx-auto my-6">
        <PlanAndPricing 
          onGetStarted={() => {
            // Handle plan selection - you can add logic here
            console.log('Plan selected');
          }}
        />
      </div>
    </div>
  );
}  