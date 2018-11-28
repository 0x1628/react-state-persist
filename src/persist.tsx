import * as React from 'react'
import {findDOMNode} from 'react-dom'
import {findAllInRenderedTree} from 'react-dom/test-utils'
import {Persist} from './index'

/* no way to get a persistent fingerprint for each render
function getComponentFingerprint(c: React.Component): string {
  const fiberNode = (c as any)._reactInternalFiber

  const result = [fiberNode.index]
  let child = fiberNode.child
  while (child) {
    result.push(child.index)
    child = child.child
  }
  return result.join('.')
}
 */
function findStateFulComponent(root: React.Component): React.Component[] {
  return findAllInRenderedTree(root,
    i => i && i instanceof React.Component && Boolean(i.state)) as React.Component[]
}

function saveStatefulComponent(targetMap: Map<any, any>, root: React.Component) {
  targetMap.clear()
  const result = findStateFulComponent(root)

  result.forEach((c, index) => {
    // TODO instance fingerprint
    // temp use index
    // targetMap.set(getComponentFingerprint(c, index), c.state)
    targetMap.set(index, c.state)
  })
}

function updateComponentWithCache(root: React.Component, data: Map<any, any>, plus: number, callback: () => void) {
  const targets = findStateFulComponent(root)
  if (targets[plus]) {
    targets[plus].setState(data.get(plus), () => {
      updateComponentWithCache(root, data, plus + 1, callback)
    })
  } else {
    callback()
  }

}

export const persist: Persist = () => {
  const persistMap: Map<number, any> = new Map()

  class PersistWrapper extends React.Component {
    node: React.Component | null = null
    observer: MutationObserver | null = null
    needReset = false
    lock = false // lock research state

    componentDidMount() {
      const el = findDOMNode(this.node!)
      const observer = this.observer = new MutationObserver(this.changeCallback)
      observer.observe(el!.parentNode!, {attributes: true, childList: true,
        subtree: true, characterData: true})

      saveStatefulComponent(persistMap, this.node!)
    }

    // only run when hot reload
    componentDidUpdate() {
      // temp lock for prevent changeCallback
      this.lock = true
      requestAnimationFrame(() => {
        updateComponentWithCache(this.node!, persistMap, 0, () => {
          requestAnimationFrame(() => {
            this.lock = false
          })
        })
      })
    }

    componentWillUnmount() {
      if (this.observer) {
        this.observer.disconnect()
      }
    }

    changeCallback = () => {
      if (!this.lock) {
        saveStatefulComponent(persistMap, this.node!)
      }
    }

    render() {
      // definitely is Component
      return React.cloneElement(React.Children.only(this.props.children), {
        ref: (el: React.Component) => { this.node = el },
      })
    }
  }

  return (element: React.ReactElement<any>) => {
    return (<PersistWrapper>{element}</PersistWrapper>)
  }
}