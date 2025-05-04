import { LucideProps } from 'lucide-react';

export const Wings = ({ size = 24, ...props }: LucideProps) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M6 12c0-6 4-10 6-10s6 4 6 10-4 10-6.5 10c-1.5 0-3-1.7-3.5-4 0 0-2 0-2-6Z" />
      <path d="M20 14c0-2 1-4 2-4" />
      <path d="M4 14c0-2-1-4-2-4" />
    </svg>
  );
};

export default Wings;