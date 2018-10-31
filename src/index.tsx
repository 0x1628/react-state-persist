import {ReactElement} from 'react'
import {persist as devPersist} from './persist'

export type Persist = () => (element: ReactElement<any>) => ReactElement<any>

const proPersist: Persist = () => {
  return (element: ReactElement<any>) => {
    return element
  }
}

export const persist = process.env.NODE_ENV === 'production' ?
  proPersist : devPersist