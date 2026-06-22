interface Props {
  username: string;
  avatarUrl?: string | null;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
}

const SIZES = {
  xs: 'h-6 w-6 text-[10px]',
  sm: 'h-8 w-8 text-xs',
  md: 'h-11 w-11 text-base',
  lg: 'h-16 w-16 text-2xl',
};

export default function UserAvatar({ username, avatarUrl, size = 'sm', className = '' }: Props) {
  const sz      = SIZES[size];
  const initial = username[0]?.toUpperCase() ?? '?';

  return (
    <div className={`flex-shrink-0 rounded-full overflow-hidden border border-border ${sz} ${className}`}>
      {avatarUrl
        ? <img src={avatarUrl} alt={username} className="h-full w-full object-cover" />
        : <div className="h-full w-full flex items-center justify-center bg-surface font-black text-gray-400">{initial}</div>
      }
    </div>
  );
}
