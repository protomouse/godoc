'use babel'
/* eslint-env jasmine */

import temp from 'temp'
import path from 'path'
import fs from 'fs-plus'

describe('godoc', () => {
  temp.track()
  let mainModule = null
  let godoc = null
  let editor = null
  let gopath = null
  let oldGopath = null
  let source = null
  let target = null

  beforeEach(() => {
    runs(() => {
      if (process.env.GOPATH) {
        oldGopath = process.env.GOPATH
      }
      gopath = fs.realpathSync(temp.mkdirSync('gopath-'))
      process.env.GOPATH = gopath
    })

    waitsForPromise(() => {
      return atom.packages.activatePackage('language-go').then(() => {
        return atom.packages.activatePackage('go-config').then(() => {
          return atom.packages.activatePackage('godoc').then((pack) => {
            mainModule = pack.mainModule
            godoc = mainModule.godoc
            return
          })
        })
      })
    })

    waitsFor(() => {
      return mainModule.getGoconfig() !== false
    })
  })

  afterEach(() => {
    if (oldGopath) {
      process.env.GOPATH = oldGopath
    } else {
      delete process.env.GOPATH
    }
  })

  describe('when the godoc command is invoked on a valid go file', () => {
    beforeEach(() => {
      runs(() => {
        source = path.join(__dirname, 'fixtures')
        target = path.join(gopath, 'src', 'godoctest')
        fs.copySync(source, target)
      })

      waitsForPromise(() => {
        return atom.workspace.open(path.join(target, 'main.go')).then((e) => {
          editor = e
          return
        })
      })
    })

    it('shows/hides the view correctly', () => {
      let view = atom.views.getView(editor)
      editor.setCursorBufferPosition([25, 10])
      expect(godoc.marker).toBeFalsy()
      let result = false
      waitsForPromise(() => {
        return godoc.commandInvoked().then((r) => {
          result = r
          return
        })
      })
      runs(() => {
        expect(godoc.marker).toBeTruthy()
        let viewPresent = () => {
          return view.classList.contains('godoc-display-active') ||
            view.classList.contains('godoc-in-progress')
        }
        expect(result).toBeTruthy()
        expect(viewPresent()).toBe(true)
        atom.commands.dispatch(view, 'godoc:hide')
        expect(godoc.marker).toBeFalsy()
        expect(viewPresent()).toBe(false)
      })
    })

    it('gets the correct documentation', () => {
      let result = false
      editor.setCursorBufferPosition([24, 10])
      waitsForPromise(() => {
        return godoc.commandInvoked().then((r) => {
          result = r
        })
      })
      runs(() => {
        expect(result).toBeTruthy()
        expect(result.success).toBe(true)
        expect(result.result.exitcode).toBe(0)
      })
    })
  })

  describe('when the godoc command is invoked on an unsaved go file', () => {
    beforeEach(() => {
      runs(() => {
        source = path.join(__dirname, 'fixtures')
        target = path.join(gopath, 'src', 'godoctest')
        fs.copySync(source, target)
      })

      waitsForPromise(() => {
        return atom.workspace.open(path.join(target, 'main.go')).then((e) => {
          e.setCursorBufferPosition([25, 46])
          e.selectLinesContainingCursors()
          e.insertText('fmt.Printf("this line has been modified\n")')
          expect(e.isModified()).toBe(true)
          editor = e
          return
        })
      })
    })

    it('gets the correct documentation', () => {
      let result = false
      editor.setCursorBufferPosition([25, 7])
      waitsForPromise(() => {
        return godoc.commandInvoked().then((r) => {
          result = r
        })
      })
      runs(() => {
        expect(result).toBeTruthy()
        expect(result.success).toBe(true)
        expect(result.result.exitcode).toBe(0)
        expect(result.result.stdout).toBeTruthy()
        expect(result.result.stdout.startsWith(`import "fmt"`)).toBe(true)
      })
    })
  })
})
