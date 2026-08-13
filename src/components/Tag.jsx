function Tag({ tag, isCount = false, size = 'sm' }) {
  const sizeClass = size === 'xs' ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-1 text-xs'
  return (
    <span
      className={`${sizeClass} rounded-full whitespace-nowrap ${isCount ? 'bg-gray-200 text-gray-700' : 'bg-blue-100 text-blue-800'}`}
    >
      {tag}
    </span>
  )
}

export default Tag
