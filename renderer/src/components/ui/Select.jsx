import React from 'react';

const Select = ({ 
  label, 
  error, 
  options = [],
  className = '', 
  containerClassName = '',
  ...props 
}) => {
  return (
    <div className={`flex flex-col gap-1.5 ${containerClassName}`}>
      {label && (
        <label className="text-sm font-medium text-slate-300">
          {label}
        </label>
      )}
      <select
        className={`
          glass px-4 py-2.5 rounded-lg 
          text-white
          focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
          transition-all duration-200
          cursor-pointer
          ${error ? 'ring-2 ring-red-500' : ''}
          ${className}
        `}
        {...props}
      >
        {options.map((option) => (
          <option 
            key={option.value} 
            value={option.value}
            className="bg-slate-800 text-white"
          >
            {option.label}
          </option>
        ))}
      </select>
      {error && (
        <span className="text-sm text-red-400">{error}</span>
      )}
    </div>
  );
};

export default Select;
