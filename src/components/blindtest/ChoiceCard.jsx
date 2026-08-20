function ChoiceCard({ choice, state, onClick, disabled, large }) {
  // state: 'idle' | 'correct' | 'wrong' | 'muted'
  const base = `relative w-full text-left rounded-xl border-2 transition-all duration-300 ease-out flex items-center gap-3 ${
    large ? 'p-5 gap-4' : 'p-4'
  }`

  const stateClass = {
    idle: 'border-gray-200 bg-white hover:border-blue-400 hover:shadow-md hover:-translate-y-0.5 cursor-pointer',
    correct: 'border-green-500 bg-green-50 shadow-md scale-[1.02]',
    wrong: 'border-red-500 bg-red-50',
    muted: 'border-gray-200 bg-white opacity-40 grayscale',
  }[state] || 'border-gray-200 bg-white'

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`${base} ${stateClass} disabled:cursor-default`}
    >
      {choice.image && (
        <img
          src={choice.image}
          alt=""
          className={`rounded-lg object-cover flex-shrink-0 bg-gray-100 ${large ? 'h-20 w-20 sm:h-28 sm:w-28' : 'h-12 w-12'}`}
          loading="lazy"
        />
      )}
      <span className={`font-medium text-gray-900 ${large ? 'text-base sm:text-lg' : 'text-sm sm:text-base'}`}>{choice.label}</span>
      {state === 'correct' && <span className="ml-auto text-green-600 text-xl">✓</span>}
      {state === 'wrong' && <span className="ml-auto text-red-600 text-xl">✗</span>}
    </button>
  )
}

export default ChoiceCard
