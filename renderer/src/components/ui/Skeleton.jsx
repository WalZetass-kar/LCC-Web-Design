import React from 'react';

const Skeleton = ({ 
  className = '', 
  variant = 'default',
  count = 1,
  ...props 
}) => {
  const variants = {
    default: 'h-4 w-full',
    text: 'h-4 w-3/4',
    title: 'h-8 w-1/2',
    circle: 'h-12 w-12 rounded-full',
    card: 'h-32 w-full',
    avatar: 'h-10 w-10 rounded-full',
    button: 'h-10 w-24 rounded-lg',
  };

  const skeletons = Array.from({ length: count }, (_, i) => (
    <div
      key={i}
      className={`
        animate-shimmer
        bg-gradient-to-r from-slate-700/50 via-slate-600/50 to-slate-700/50
        bg-[length:1000px_100%]
        rounded
        ${variants[variant]}
        ${className}
      `}
      {...props}
    />
  ));

  return count === 1 ? skeletons[0] : <div className="space-y-3">{skeletons}</div>;
};

// Skeleton presets for common use cases
export const SkeletonCard = ({ className = '' }) => (
  <div className={`glass rounded-xl p-6 space-y-4 ${className}`}>
    <Skeleton variant="title" />
    <Skeleton variant="text" count={3} />
  </div>
);

export const SkeletonTable = ({ rows = 5, columns = 4 }) => (
  <div className="space-y-3">
    {/* Header */}
    <div className="flex gap-4">
      {Array.from({ length: columns }).map((_, i) => (
        <Skeleton key={i} className="h-6 flex-1" />
      ))}
    </div>
    {/* Rows */}
    {Array.from({ length: rows }).map((_, i) => (
      <div key={i} className="flex gap-4">
        {Array.from({ length: columns }).map((_, j) => (
          <Skeleton key={j} className="h-10 flex-1" />
        ))}
      </div>
    ))}
  </div>
);

export const SkeletonProduct = ({ count = 4 }) => (
  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className="glass rounded-xl p-4 space-y-3">
        <Skeleton variant="circle" className="mx-auto" />
        <Skeleton variant="text" />
        <Skeleton className="h-6 w-20 mx-auto" />
      </div>
    ))}
  </div>
);

export const SkeletonDashboard = () => (
  <div className="space-y-6">
    {/* Stats Cards */}
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="glass rounded-xl p-6 space-y-3">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-10 w-32" />
        </div>
      ))}
    </div>
    {/* Chart/List */}
    <SkeletonCard />
  </div>
);

export default Skeleton;
