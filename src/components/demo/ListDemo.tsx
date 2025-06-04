import { useToast } from '@/hooks/useToast'
import React, { useState } from 'react'
import { List, ListGroup, ListItem, NestedListItem } from '../ui/list'

export function ListDemo() {
  const { showToast } = useToast()

  const [expandedGroups, setExpandedGroups] = useState({
    fruits: true,
    vegetables: false,
  })

  const [expandedItems, setExpandedItems] = useState({
    animals: false,
    electronics: true,
  })

  const handleExpandedChange = (group: string, expanded: boolean) => {
    setExpandedGroups({
      ...expandedGroups,
      [group]: expanded,
    })
  }

  const handleItemExpandedChange = (item: string, expanded: boolean) => {
    setExpandedItems({
      ...expandedItems,
      [item]: expanded,
    })
  }

  const longList = Array.from({ length: 15 }, (_, i) => `Item ${i + 1}`)

  const handleAction1 = () => {
    showToast({
      title: 'Action 1',
      description: 'You clicked Action 1',
      type: 'info',
    })
  }

  const handleAction2 = () => {
    showToast({
      title: 'Action 2',
      description: 'You clicked Action 2',
      type: 'success',
    })
  }

  const handleAction3 = () => {
    showToast({
      title: 'Action 3',
      description: 'You clicked Action 3',
      type: 'warning',
    })
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
      {/* Basic List */}
      <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow">
        <h3 className="mb-4 text-lg font-semibold">Basic List</h3>
        <List>
          <ListItem>First item</ListItem>
          <ListItem>Second item</ListItem>
          <ListItem>Third item</ListItem>
          <ListItem>Fourth item</ListItem>
        </List>
      </div>

      {/* Ordered List */}
      <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow">
        <h3 className="mb-4 text-lg font-semibold">Ordered List</h3>
        <List type="ol">
          <ListItem>First item</ListItem>
          <ListItem>Second item</ListItem>
          <ListItem>Third item</ListItem>
          <ListItem>Fourth item</ListItem>
        </List>
      </div>

      {/* List Variants */}
      <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow">
        <h3 className="mb-4 text-lg font-semibold">List Variants</h3>
        <List variant="disc" className="mb-4">
          <ListItem>Disc variant</ListItem>
          <ListItem>Second item</ListItem>
        </List>
        <List variant="circle" className="mb-4">
          <ListItem>Circle variant</ListItem>
          <ListItem>Second item</ListItem>
        </List>
        <List variant="square" className="mb-4">
          <ListItem>Square variant</ListItem>
          <ListItem>Second item</ListItem>
        </List>
        <List variant="none">
          <ListItem>No marker</ListItem>
          <ListItem>Second item</ListItem>
        </List>
      </div>

      {/* List Sizes */}
      <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow">
        <h3 className="mb-4 text-lg font-semibold">List Sizes</h3>
        <List size="sm" className="mb-4">
          <ListItem>Small size</ListItem>
          <ListItem>Second item</ListItem>
        </List>
        <List size="md" className="mb-4">
          <ListItem>Medium size (default)</ListItem>
          <ListItem>Second item</ListItem>
        </List>
        <List size="lg">
          <ListItem>Large size</ListItem>
          <ListItem>Second item</ListItem>
        </List>
      </div>

      {/* Divided List */}
      <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow">
        <h3 className="mb-4 text-lg font-semibold">Divided List</h3>
        <List divided>
          <ListItem>First item</ListItem>
          <ListItem>Second item</ListItem>
          <ListItem>Third item</ListItem>
          <ListItem>Fourth item</ListItem>
        </List>
      </div>

      {/* Horizontal List */}
      <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow">
        <h3 className="mb-4 text-lg font-semibold">Horizontal List</h3>
        <List horizontal>
          <ListItem>First</ListItem>
          <ListItem>Second</ListItem>
          <ListItem>Third</ListItem>
          <ListItem>Fourth</ListItem>
        </List>
      </div>

      {/* List with Icons */}
      <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow">
        <h3 className="mb-4 text-lg font-semibold">List with Icons</h3>
        <List variant="none">
          <ListItem
            icon={
              <svg
                className="w-5 h-5 text-green-500"
                fill="currentColor"
                viewBox="0 0 20 20"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
            }
          >
            Item with check icon
          </ListItem>
          <ListItem
            icon={
              <svg
                className="w-5 h-5 text-blue-500"
                fill="currentColor"
                viewBox="0 0 20 20"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                  clipRule="evenodd"
                />
              </svg>
            }
          >
            Item with info icon
          </ListItem>
          <ListItem
            icon={
              <svg
                className="w-5 h-5 text-red-500"
                fill="currentColor"
                viewBox="0 0 20 20"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
            }
          >
            Item with error icon
          </ListItem>
        </List>
      </div>

      {/* List with Active/Disabled States */}
      <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow">
        <h3 className="mb-4 text-lg font-semibold">States</h3>
        <List>
          <ListItem>Normal item</ListItem>
          <ListItem active>Active item</ListItem>
          <ListItem disabled>Disabled item</ListItem>
          <ListItem>Normal item</ListItem>
        </List>
      </div>

      {/* List with Suffixes */}
      <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow">
        <h3 className="mb-4 text-lg font-semibold">List with Suffixes</h3>
        <List>
          <ListItem suffix={<span className="text-sm text-gray-500">New</span>}>
            Item with suffix
          </ListItem>
          <ListItem
            suffix={
              <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full">
                Tag
              </span>
            }
          >
            Item with tag
          </ListItem>
          <ListItem
            suffix={
              <button className="text-blue-500 hover:text-blue-700">
                Action
              </button>
            }
          >
            Item with action
          </ListItem>
        </List>
      </div>

      {/* Hoverable List */}
      <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow">
        <h3 className="mb-4 text-lg font-semibold">Hoverable List</h3>
        <List hoverable>
          <ListItem clickable onClick={handleAction1}>
            Clickable item 1
          </ListItem>
          <ListItem clickable onClick={handleAction2}>
            Clickable item 2
          </ListItem>
          <ListItem clickable onClick={handleAction3}>
            Clickable item 3
          </ListItem>
        </List>
      </div>

      {/* List with Max Items */}
      <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow">
        <h3 className="mb-4 text-lg font-semibold">List with Max Items</h3>
        <List maxItems={5}>
          {longList.map((item, index) => (
            <ListItem key={index}>{item}</ListItem>
          ))}
        </List>
      </div>

      {/* List Groups */}
      <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow">
        <h3 className="mb-4 text-lg font-semibold">List Groups</h3>
        <div>
          <ListGroup
            heading="Fruits"
            collapsible
            expanded={expandedGroups.fruits}
            onExpandedChange={(expanded) =>
              handleExpandedChange('fruits', expanded)
            }
            badge={
              <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full">
                3
              </span>
            }
          >
            <List>
              <ListItem>Apple</ListItem>
              <ListItem>Banana</ListItem>
              <ListItem>Orange</ListItem>
            </List>
          </ListGroup>
          <ListGroup
            heading="Vegetables"
            collapsible
            expanded={expandedGroups.vegetables}
            onExpandedChange={(expanded) =>
              handleExpandedChange('vegetables', expanded)
            }
            badge={
              <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
                3
              </span>
            }
          >
            <List>
              <ListItem>Carrot</ListItem>
              <ListItem>Broccoli</ListItem>
              <ListItem>Spinach</ListItem>
            </List>
          </ListGroup>
        </div>
      </div>

      {/* Nested List Items */}
      <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow">
        <h3 className="mb-4 text-lg font-semibold">Nested List Items</h3>
        <List>
          <NestedListItem
            label="Animals"
            expanded={expandedItems.animals}
            onExpandedChange={(expanded) =>
              handleItemExpandedChange('animals', expanded)
            }
          >
            <List>
              <ListItem>Dog</ListItem>
              <ListItem>Cat</ListItem>
              <ListItem>Bird</ListItem>
            </List>
          </NestedListItem>
          <NestedListItem
            label="Electronics"
            expanded={expandedItems.electronics}
            onExpandedChange={(expanded) =>
              handleItemExpandedChange('electronics', expanded)
            }
          >
            <List>
              <ListItem>Phone</ListItem>
              <ListItem>Laptop</ListItem>
              <ListItem>Tablet</ListItem>
            </List>
          </NestedListItem>
          <ListItem>Regular item</ListItem>
        </List>
      </div>
    </div>
  )
}

export default ListDemo
