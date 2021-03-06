import { F, lensProp, path, T } from 'ramda'
import { lensEq } from 'ramda-adjunct'
import attachFields from '../../internal/attachFields'

const name1 = `name1`
const name2 = `name2`
const key1 = `key1`
const key2 = `key2`
const value1 = `value1`
const value2 = `value2`
const EMPTY_NODE = {}
const unmatchedDescriptor = {
  predicate: F,
  fields: [],
}
const DEFAULT_CONTEXT = {}

const lensPropEq = (name, value) => lensEq(lensProp(name), value)

describe(`attachFields`, () => {
  let createNode
  let actions
  let getNode

  beforeEach(() => {
    actions = {}
    createNode = jest.fn()
    getNode = jest.fn()
    actions.createNodeField = createNode
  })

  // ---------------------------------------------------------------------------
  // Descriptor Validation
  // ---------------------------------------------------------------------------

  describe(`throws with invalid descriptors`, () => {
    expect(() =>
      // Missing predicate key on descriptor
      attachFields(EMPTY_NODE, actions, getNode, [{ fields: [] }])
    ).toThrow()
  })

  // ---------------------------------------------------------------------------
  // Descriptor Predicates
  // ---------------------------------------------------------------------------

  describe(`with no descriptors`, () => {
    it(`does nothing`, () => {
      const node = {}

      attachFields(node, actions, getNode)

      expect(createNode).not.toBeCalled()
    })
  })

  describe(`with predicates that don't match`, () => {
    it(`does nothing`, () => {
      const descriptors = [unmatchedDescriptor, unmatchedDescriptor]

      attachFields(EMPTY_NODE, actions, getNode, descriptors)

      expect(createNode).not.toBeCalled()
    })
  })

  describe(`with predicates that match`, () => {
    it(`changes the node using the matching descriptors`, () => {
      const node = {
        [key1]: 1,
        [key2]: true,
      }

      const descriptors = [
        {
          predicate: lensPropEq(key1, 1),
          fields: [
            {
              name: name1,
            },
          ],
        },
        unmatchedDescriptor,
        {
          predicate: lensPropEq(key2, true),
          fields: [
            {
              name: name2,
            },
          ],
        },
      ]
      attachFields(node, actions, getNode, descriptors)

      expect(createNode.mock.calls).toEqual([
        [
          {
            node,
            name: name1,
            value: undefined,
          },
        ],
        [
          {
            node,
            name: name2,
            value: undefined,
          },
        ],
      ])
    })
  })

  // ---------------------------------------------------------------------------
  // name field
  // ---------------------------------------------------------------------------

  describe(`with only a name`, () => {
    it(`will use the node prop of the same name`, () => {
      const node = {
        [name1]: value1,
      }

      const descriptors = [
        {
          predicate: T,
          fields: [
            {
              name: name1,
            },
          ],
        },
      ]

      attachFields(node, actions, getNode, descriptors)

      expect(createNode.mock.calls).toEqual([
        [
          {
            node,
            name: name1,
            value: value1,
          },
        ],
      ])
    })
  })

  describe(`with a getter`, () => {
    it(`will use the getter`, () => {
      const node = {
        [key1]: {
          [key2]: value1,
        },
      }

      const descriptors = [
        {
          predicate: T,
          fields: [
            {
              name: name1,
              getter: path([key1, key2]),
            },
          ],
        },
      ]

      attachFields(node, actions, getNode, descriptors)

      expect(createNode.mock.calls).toEqual([
        [
          {
            node,
            name: name1,
            value: value1,
          },
        ],
      ])
    })
  })

  // ---------------------------------------------------------------------------
  // defaultValue field
  // ---------------------------------------------------------------------------

  describe(`when value exits`, () => {
    it(`defaultValue isn't used`, () => {
      const node = {
        [name1]: value1,
      }

      const descriptors = [
        {
          predicate: T,
          fields: [
            {
              name: name1,
              defaultValue: value2,
            },
          ],
        },
      ]

      attachFields(node, actions, getNode, descriptors)

      expect(createNode.mock.calls).toEqual([
        [
          {
            node,
            name: name1,
            value: value1,
          },
        ],
      ])
    })

    describe(`when value is 'false'`, () => {
      it(`defaultValue isn't used`, () => {
        const node = {
          [name1]: false,
        }

        const descriptors = [
          {
            predicate: T,
            fields: [
              {
                name: name1,
                defaultValue: true,
              },
            ],
          },
        ]

        attachFields(node, actions, getNode, descriptors)

        expect(createNode.mock.calls).toEqual([
          [
            {
              node,
              name: name1,
              value: false,
            },
          ],
        ])
      })
    })
  })

  describe(`when value doesn't exist`, () => {
    describe(`when 'defaultValue' field is a function`, () => {
      it(`calls the 'defaultValue' field value and uses the return value`, () => {
        const defaultValue = jest.fn().mockReturnValueOnce(value2)

        const node = {
          [key1]: value1,
        }

        const descriptors = [
          {
            predicate: T,
            fields: [
              {
                name: name1,
                defaultValue,
              },
            ],
          },
        ]

        attachFields(node, actions, getNode, descriptors)

        expect(defaultValue).toBeCalledWith(
          node,
          DEFAULT_CONTEXT,
          actions,
          getNode
        )
        expect(createNode.mock.calls).toEqual([
          [
            {
              node,
              name: name1,
              value: value2,
            },
          ],
        ])
      })
    })

    describe(`when 'defaultValue' field is not a function`, () => {
      it(`uses the 'defaultValue' field value`, () => {
        const node = {}

        const descriptors = [
          {
            predicate: T,
            fields: [
              {
                name: name1,
                defaultValue: value2,
              },
            ],
          },
        ]

        attachFields(node, actions, getNode, descriptors)

        expect(createNode.mock.calls).toEqual([
          [
            {
              node,
              name: name1,
              value: value2,
            },
          ],
        ])
      })
    })
  })

  // ---------------------------------------------------------------------------
  // transformer Field
  // ---------------------------------------------------------------------------

  describe(`when transformer is defined`, () => {
    it(`transforms the value`, () => {
      const transformer = jest.fn().mockReturnValueOnce(value2)

      const node = {
        [name1]: value1,
      }

      const descriptors = [
        {
          predicate: T,
          fields: [
            {
              name: name1,
              transformer,
            },
          ],
        },
      ]

      attachFields(node, actions, getNode, descriptors)

      expect(transformer).toBeCalledWith(
        value1,
        node,
        DEFAULT_CONTEXT,
        actions,
        getNode
      )

      expect(createNode.mock.calls).toEqual([
        [
          {
            node,
            name: name1,
            value: value2,
          },
        ],
      ])
    })
  })

  // ---------------------------------------------------------------------------
  // setter Field
  // ---------------------------------------------------------------------------

  describe(`when setter is defined`, () => {
    describe(`when name is also defined`, () => {
      it(`uses the name setter`, () => {
        const setter = (value, node, context, { createNodeField }) => {
          createNodeField({
            node,
            name: name2,
            value,
          })
        }

        const node = {
          [name1]: value1,
        }

        const descriptors = [
          {
            predicate: T,
            fields: [
              {
                name: name1,
                setter,
              },
            ],
          },
        ]

        attachFields(node, actions, getNode, descriptors)

        expect(createNode.mock.calls).toEqual([
          [
            {
              node,
              name: name2,
              value: value1,
            },
          ],
        ])
      })
    })

    describe(`when no name is defined`, () => {
      it(`uses the setter`, () => {
        const setter = (value, node, context, { createNodeField }) => {
          createNodeField({
            node,
            name: name2,
            value,
          })
        }

        const node = {
          [name1]: value1,
        }

        const descriptors = [
          {
            predicate: T,
            fields: [
              {
                getter: () => value1,
                setter,
              },
            ],
          },
        ]

        attachFields(node, actions, getNode, descriptors)

        expect(createNode.mock.calls).toEqual([
          [
            {
              node,
              name: name2,
              value: value1,
            },
          ],
        ])
      })
    })

    describe(`when no name or getter is defined`, () => {
      it(`uses the setter`, () => {
        const setter = (value, node, context, { createNodeField }) => {
          createNodeField({
            node,
            name: name2,
            value: value1,
          })
        }

        const node = {
          [name1]: value1,
        }

        const descriptors = [
          {
            predicate: T,
            fields: [
              {
                setter,
              },
            ],
          },
        ]

        attachFields(node, actions, getNode, descriptors)

        expect(createNode.mock.calls).toEqual([
          [
            {
              node,
              name: name2,
              value: value1,
            },
          ],
        ])
      })
    })
  })

  // ---------------------------------------------------------------------------
  // validator
  // ---------------------------------------------------------------------------

  describe(`validator with invalid value`, () => {
    it(`throws`, () => {
      const validator = jest.fn().mockReturnValueOnce(false)

      const descriptors = [
        {
          predicate: T,
          fields: [
            {
              name: name2,
              validator,
            },
          ],
        },
      ]

      expect(() =>
        attachFields(EMPTY_NODE, actions, getNode, descriptors)
      ).toThrow(
        `[gatsby-plugin-node-fields] Invalid Field Error: Validator function for field named 'name2' returned false for field value 'undefined'`
      )
      expect(validator).toBeCalledWith(
        undefined,
        EMPTY_NODE,
        {},
        actions,
        getNode
      )
    })
  })

  describe(`validator with valid value`, () => {
    it(`doesn't throw`, () => {
      const validator = jest.fn().mockReturnValueOnce(true)

      const descriptors = [
        {
          predicate: T,
          fields: [
            {
              name: name2,
              defaultValue: value1,
              validator,
            },
          ],
        },
      ]

      expect(() =>
        attachFields(EMPTY_NODE, actions, getNode, descriptors)
      ).not.toThrow()
      expect(validator).toBeCalledWith(value1, EMPTY_NODE, {}, actions, getNode)
    })
  })

  // ---------------------------------------------------------------------------
  // context
  // ---------------------------------------------------------------------------

  describe(`when context is defined`, () => {
    it(`is passed to functions`, () => {
      const getter = jest.fn()
      const defaultValue = jest.fn()
      const validator = jest.fn().mockReturnValueOnce(true)
      const transformer = jest.fn()
      const setter = jest.fn()

      const context = {
        value: 1,
      }

      const descriptors = [
        {
          predicate: T,
          fields: [
            {
              getter,
              defaultValue,
              validator,
              transformer,
              setter,
            },
          ],
        },
      ]

      attachFields(EMPTY_NODE, actions, getNode, descriptors, context)

      expect(getter).toBeCalledWith(EMPTY_NODE, context, actions, getNode)
      expect(defaultValue).toBeCalledWith(EMPTY_NODE, context, actions, getNode)
      expect(transformer).toBeCalledWith(
        undefined,
        EMPTY_NODE,
        context,
        actions,
        getNode
      )
      expect(validator).toBeCalledWith(
        undefined,
        EMPTY_NODE,
        context,
        actions,
        getNode
      )
      expect(setter).toBeCalledWith(
        undefined,
        EMPTY_NODE,
        context,
        actions,
        getNode
      )
    })
  })

  // ---------------------------------------------------------------------------
  // getNode
  // ---------------------------------------------------------------------------

  describe(`getNode function`, () => {
    it(`is passed to predicate`, () => {
      const predicate = jest.fn()

      const descriptors = [
        {
          predicate,
          fields: [],
        },
      ]

      attachFields(EMPTY_NODE, actions, getNode, descriptors)

      expect(predicate).toBeCalledWith(EMPTY_NODE, getNode)
    })
  })
})
