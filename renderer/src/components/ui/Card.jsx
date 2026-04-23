import React from 'react';
import { useTheme } from '../../context/ThemeContext';

const Card = ({ 
  children, 
  title, 
  subtitle,
  className = '',
  headerAction,
  hover = false,
  ...props 
}) => {
  const { currentTheme } = useTheme();
  
  return (
    <div 
      className={`
        glass rounded-xl p-6 
        border ${currentTheme.border}
        backdrop-blur-xl
        transition-all duration-300
        ${hover ? 'hover:scale-[1.02] hover:shadow-glow cursor-pointer' : ''}
        animate-fade-in 
        ${className}
      `} 
      {...props}
    >
      {(title || headerAction) && (
        <div className="flex items-center justify-between mb-4 pb-4 border-b border-white/10">
          <div>
            {title && (
              <h3 className="text-xl font-semibold text-white flex items-center gap-2">
                {title}
                <span className={`inline-block w-2 h-2 rounded-full ${currentTheme.accentSolid} animate-pulse`}></span>
              </h3>
            )}
            {subtitle && (
              <p className="text-sm text-slate-400 mt-1">{subtitle}</p>
            )}
          </div>
          {headerAction && (
            <div>{headerAction}</div>
          )}
        </div>
      )}
      {children}
    </div>
  );
};

export default Card;
