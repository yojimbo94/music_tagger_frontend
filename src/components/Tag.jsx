function Tag({ tag, isCount = false }) {
  return (
    <span 
      className={`px-2 py-1 text-xs rounded-full ${isCount ? 'bg-gray-200 text-gray-700' : 'bg-blue-100 text-blue-800'}`}
    >
      {tag}
    </span>
  )
}

export default Tag