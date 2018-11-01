import * as React from 'react'
import {readFileSync} from 'fs'
import * as path from 'path'
import {findDOMNode, render} from 'react-dom'
import * as renderer from 'react-test-renderer'
import {persist} from '../persist'
import * as puppeteer from 'puppeteer'

let browser: puppeteer.Browser
let page: puppeteer.Page

const html = (babel: string) => `<!doctype html><body><div id="root"></div></body>
<script src="https://unpkg.com/react@16/umd/react.development.js" crossorigin></script>
<script src="https://unpkg.com/react-dom@16/umd/react-dom.development.js" crossorigin></script>
<script src="https://unpkg.com/react-dom@16/umd/react-dom-test-utils.development.js" crossorigin></script>
<script src="https://unpkg.com/babel-standalone@6/babel.min.js"></script>
<script>${readFileSync(path.resolve(process.cwd(), 'dist', 'react-state-persistent.umd.js')).toString()}</script>
<script type="text/babel">${babel}</script>`

beforeAll(async () => {
  try {
    browser = await puppeteer.launch({args: ['--no-sandbox', '--disable-setuid-sandbox'], headless: true})
    page = await browser.newPage()
  } catch (e) {
    console.error(e)
  }
})

afterAll(async () => {
  await browser.close()
})

test('normal', async () => {
  expect.assertions(1)
  await page.goto(`data:text/html,${html('')}`)
  const content = await page.content()
  expect(content).toContain('root')
})

const app = `
class Child extends React.Component {
  state = {count: 0}

  change = () => {
    this.setState({count: this.state.count + 1})
  }

  render() {
    return (
      <div>
        {'111' + 'child'}
        <span>childstate{this.state.count}</span>
      </div>
    )
  }
}

// simulate hot reload
const createApp = () => {
  class App extends React.Component {
    node: React.Component | null = null
  
    componentDidMount() {
      if (this.props.change) {
        this.node.change()
      }
    }
  
    render() {
      return (
        <div>
          {'000' + 'app'}
          <Child ref={el => this.node = el} />
        </div>
      )
    }
  }
  return App
}
`

test('react', async () => {
  expect.assertions(2)

  await page.goto(`data:text/html,${html(`
    ${app}
    const container = document.getElementById('root')
    const App = createApp()
    ReactDOM.render(<App />, container)
  `)}`)
  const content = await page.content()
  expect(content).toContain('000app')
  expect(content).toContain('childstate0')
})

test('react setState', async () => {
  expect.assertions(1)

  await page.goto(`data:text/html,${html(`
    ${app}
    const container = document.getElementById('root')
    const App = createApp()
    ReactDOM.render(<App change={true} />, container)
  `)}`)
  const content = await page.content()
  expect(content).toContain('childstate1')
})

test('react setState and rerender', async () => {
  expect.assertions(1)

  await page.goto(`data:text/html,${html(`
    ${app}
    const container = document.getElementById('root')
    const App = createApp()
    ReactDOM.render(<App change={true} />, container)
    requestAnimationFrame(() => {
      const NewApp = createApp()
      ReactDOM.render(<NewApp />, container)
    })
  `)}`)
  const content = await page.content()
  expect(content).toContain('childstate0')
})

test('react state persistent', async () => {
  expect.assertions(1)
  await page.goto(`data:text/html,${html(`
    ${app}
    const container = document.getElementById('root')
    const cached = ReactStatePersistent.persist()
    const App = createApp()
    ReactDOM.render(cached(<App />), container)
  `)}`)
  const content = await page.content()
  expect(content).toContain('childstate0')
})

test('react state persistent and rerender', async () => {
  expect.assertions(1)
  await page.goto(`data:text/html,${html(`
    ${app}
    const container = document.getElementById('root')
    const cached = ReactStatePersistent.persist()
    const App = createApp()
    ReactDOM.render(cached(<App change={true} />), container)
    requestAnimationFrame(() => {
      const NewApp = createApp()
      ReactDOM.render(cached(<NewApp />), container)
    })
  `)}`)
  const content = await page.content()
  expect(content).toContain('childstate1')
})
