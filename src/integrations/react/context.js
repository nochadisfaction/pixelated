const contexts = new WeakMap()

const ID_PREFIX = 'r'

function getContext(rendererContextResult) {
  if (contexts.has(rendererContextResult)) {
    return contexts.get(rendererContextResult)
  }
  const ctx = {
    currentIndex: 0,
    get id() {
      return ID_PREFIX + this.currentIndex.toString()
    },
  }
  contexts.set(rendererContextResult, ctx)
  return ctx
}

export function incrementId(rendererContextResult) {
  const ctx = getContext(rendererContextResult)
  const { id } = ctx
  ctx.currentIndex++
  return id
}
