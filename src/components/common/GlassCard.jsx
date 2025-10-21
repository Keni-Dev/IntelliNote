function GlassCard({ children, className = '', onClick }) {
  return (
    <div
      onClick={onClick}
      className={`
        bg-white/10 
        backdrop-blur-glass 
        rounded-lg 
        border border-white/20 
        shadow-lg 
        hover:bg-white/[0.15] 
        transition-all 
        duration-200
        ${onClick ? 'cursor-pointer' : ''}
        ${className}
      `}
    >
      {children}
    </div>
  );
}

export default GlassCard;
