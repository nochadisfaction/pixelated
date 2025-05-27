'use strict'
const __spreadArray =
  (this && this.__spreadArray) ||
  function (to, from, pack) {
    if (pack || arguments.length === 2) {
      for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
          if (!ar) {
            ar = Array.prototype.slice.call(from, 0, i)
          }
          ar[i] = from[i]
        }
      }
    }
    return to.concat(ar || Array.prototype.slice.call(from))
  }
Object.defineProperty(exports, '__esModule', { value: true })
exports.Select = Select
exports.SelectTrigger = SelectTrigger
exports.SelectContent = SelectContent
exports.SelectItem = SelectItem
exports.SelectGroup = SelectGroup
exports.SelectLabel = SelectLabel
exports.SimpleSelect = SimpleSelect
exports.SelectValue = SelectValue
const React = require('react')
const react_1 = require('react')
const SelectContext = (0, react_1.createContext)(undefined)
function useSelectContext() {
  const context = (0, react_1.useContext)(SelectContext)
  if (!context) {
    throw new Error('Select components must be used within a Select provider')
  }
  return context
}
// Main Select container component
function Select(_a) {
  const defaultValue = _a.defaultValue,
    value = _a.value,
    onValueChange = _a.onValueChange,
    children = _a.children,
    _b = _a.disabled,
    disabled = _b === void 0 ? false : _b,
    _c = _a.className,
    className = _c === void 0 ? '' : _c,
    _d = _a.placeholder,
    placeholder = _d === void 0 ? 'Select an option' : _d
  // Track registered option values
  const _e = (0, react_1.useState)([]),
    options = _e[0],
    setOptions = _e[1]
  // Initialize with controlled value or defaultValue
  const _f = (0, react_1.useState)(
      value !== undefined ? value : defaultValue || '',
    ),
    internalValue = _f[0],
    setInternalValue = _f[1]
  // Dropdown state
  const _g = (0, react_1.useState)(false),
    isOpen = _g[0],
    setIsOpen = _g[1]
  // Refs for accessibility and click outside detection
  const triggerRef = (0, react_1.useRef)(null)
  const contentRef = (0, react_1.useRef)(null)
  // If this is a controlled component, use the provided value
  const currentValue = value !== undefined ? value : internalValue
  // Update internal value when controlled value changes
  ;(0, react_1.useEffect)(
    function () {
      if (value !== undefined) {
        setInternalValue(value)
      }
    },
    [value],
  )
  // Close the dropdown when clicking outside
  ;(0, react_1.useEffect)(
    function () {
      const handleClickOutside = function (event) {
        if (
          isOpen &&
          contentRef.current &&
          triggerRef.current &&
          !contentRef.current.contains(event.target) &&
          !triggerRef.current.contains(event.target)
        ) {
          setIsOpen(false)
        }
      }
      document.addEventListener('mousedown', handleClickOutside)
      return function () {
        document.removeEventListener('mousedown', handleClickOutside)
      }
    },
    [isOpen],
  )
  // Set value and call onValueChange if provided
  const setValue = (0, react_1.useCallback)(
    function (newValue) {
      if (value === undefined) {
        setInternalValue(newValue)
      }
      onValueChange === null || onValueChange === void 0
        ? void 0
        : onValueChange(newValue)
      setIsOpen(false)
    },
    [onValueChange, value],
  )
  // Register a new option
  const registerOption = (0, react_1.useCallback)(function (
    optionValue,
    label,
  ) {
    setOptions(function (prev) {
      const exists = prev.some(function (o) {
        return o.value === optionValue
      })
      if (!exists) {
        return __spreadArray(
          __spreadArray([], prev, true),
          [{ value: optionValue, label: label }],
          false,
        )
      }
      return prev
    })
  }, [])
  // Unregister an option
  const unregisterOption = (0, react_1.useCallback)(function (optionValue) {
    setOptions(function (prev) {
      return prev.filter(function (o) {
        return o.value !== optionValue
      })
    })
  }, [])
  // Get the selected label
  const selectedOption = options.find(function (o) {
    return o.value === currentValue
  })
  const selectedLabel =
    (selectedOption === null || selectedOption === void 0
      ? void 0
      : selectedOption.label) || placeholder
  return React.createElement(
    SelectContext.Provider,
    {
      value: {
        value: currentValue,
        setValue: setValue,
        isOpen: isOpen,
        setIsOpen: setIsOpen,
        registerOption: registerOption,
        unregisterOption: unregisterOption,
        options: options,
        triggerRef: triggerRef,
        contentRef: contentRef,
        selectedLabel: selectedLabel,
        disabled: disabled,
      },
    },
    React.createElement(
      'div',
      { className: 'select-container '.concat(className) },
      children,
    ),
  )
}
// SelectTrigger component - the button that opens the dropdown
function SelectTrigger(_a) {
  const children = _a.children,
    _b = _a.className,
    className = _b === void 0 ? '' : _b,
    ariaLabel = _a['aria-label']
  const _c = useSelectContext(),
    isOpen = _c.isOpen,
    setIsOpen = _c.setIsOpen,
    triggerRef = _c.triggerRef,
    selectedLabel = _c.selectedLabel,
    disabled = _c.disabled
  const handleKeyDown = function (e) {
    if (disabled) {
      return
    }
    switch (e.key) {
      case 'Enter':
      case ' ':
      case 'ArrowDown':
        e.preventDefault()
        setIsOpen(true)
        break
      case 'Escape':
        e.preventDefault()
        setIsOpen(false)
        break
    }
  }
  return React.createElement(
    'button',
    {
      'type': 'button',
      'role': 'combobox',
      'aria-expanded': isOpen,
      'aria-label': ariaLabel || 'Select option',
      'className': 'select-trigger '
        .concat(isOpen ? 'select-trigger-open' : '', ' ')
        .concat(className),
      'ref': triggerRef,
      'onClick': function () {
        return !disabled && setIsOpen(!isOpen)
      },
      'onKeyDown': handleKeyDown,
      'disabled': disabled,
    },
    children || selectedLabel,
    React.createElement(
      'span',
      { className: 'select-trigger-icon' },
      React.createElement(
        'svg',
        {
          width: '12',
          height: '12',
          viewBox: '0 0 12 12',
          fill: 'none',
          xmlns: 'http://www.w3.org/2000/svg',
          style: { transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)' },
        },
        React.createElement('path', {
          d: 'M2.5 4.5L6 8L9.5 4.5',
          stroke: 'currentColor',
          strokeWidth: '1.5',
          strokeLinecap: 'round',
          strokeLinejoin: 'round',
        }),
      ),
    ),
  )
}
// SelectContent component - the dropdown content
function SelectContent(_a) {
  const children = _a.children,
    _b = _a.className,
    className = _b === void 0 ? '' : _b,
    _c = _a.position,
    position = _c === void 0 ? 'popper' : _c
  const _d = useSelectContext(),
    isOpen = _d.isOpen,
    contentRef = _d.contentRef
  if (!isOpen) {
    return null
  }
  return React.createElement(
    'div',
    {
      className: 'select-content '
        .concat(
          position === 'popper'
            ? 'select-content-popper'
            : 'select-content-item-aligned',
          ' ',
        )
        .concat(className),
      ref: contentRef,
      role: 'listbox',
    },
    children,
  )
}
// SelectItem component - a selectable option in the dropdown
function SelectItem(_a) {
  const value = _a.value,
    children = _a.children,
    _b = _a.className,
    className = _b === void 0 ? '' : _b,
    _c = _a.disabled,
    disabled = _c === void 0 ? false : _c
  const _d = useSelectContext(),
    selectedValue = _d.value,
    setValue = _d.setValue,
    registerOption = _d.registerOption,
    unregisterOption = _d.unregisterOption
  // Register/unregister this option on mount/unmount
  ;(0, react_1.useEffect)(
    function () {
      registerOption(value, children)
      return function () {
        return unregisterOption(value)
      }
    },
    [value, children, registerOption, unregisterOption],
  )
  // Determine if this option is currently selected
  const isSelected = selectedValue === value
  return React.createElement(
    'div',
    {
      'role': 'option',
      'aria-selected': isSelected,
      'className': 'select-item '
        .concat(isSelected ? 'select-item-selected' : '', ' ')
        .concat(disabled ? 'select-item-disabled' : '', ' ')
        .concat(className),
      'onClick': function () {
        return !disabled && setValue(value)
      },
      'data-value': value,
      'data-disabled': disabled,
    },
    children,
    isSelected &&
      React.createElement(
        'span',
        { className: 'select-item-check' },
        React.createElement(
          'svg',
          {
            width: '12',
            height: '12',
            viewBox: '0 0 12 12',
            fill: 'none',
            xmlns: 'http://www.w3.org/2000/svg',
          },
          React.createElement('path', {
            d: 'M2.5 6L5 8.5L9.5 4',
            stroke: 'currentColor',
            strokeWidth: '1.5',
            strokeLinecap: 'round',
            strokeLinejoin: 'round',
          }),
        ),
      ),
  )
}
// SelectGroup component - a group of related options
function SelectGroup(_a) {
  const children = _a.children,
    _b = _a.className,
    className = _b === void 0 ? '' : _b
  return React.createElement(
    'div',
    { className: 'select-group '.concat(className), role: 'group' },
    children,
  )
}
// SelectLabel component - a label for a group of options
function SelectLabel(_a) {
  const children = _a.children,
    _b = _a.className,
    className = _b === void 0 ? '' : _b
  return React.createElement(
    'div',
    { className: 'select-label '.concat(className) },
    children,
  )
}
function SimpleSelect(_a) {
  const options = _a.options,
    value = _a.value,
    defaultValue = _a.defaultValue,
    onChange = _a.onChange,
    _b = _a.placeholder,
    placeholder = _b === void 0 ? 'Select an option' : _b,
    _c = _a.disabled,
    disabled = _c === void 0 ? false : _c,
    _d = _a.className,
    className = _d === void 0 ? '' : _d,
    label = _a.label
  return React.createElement(
    'div',
    { className: 'simple-select '.concat(className) },
    label &&
      React.createElement('label', { className: 'simple-select-label' }, label),
    React.createElement(
      Select,
      {
        value: value,
        defaultValue: defaultValue,
        onValueChange: onChange,
        disabled: disabled,
        placeholder: placeholder,
      },
      React.createElement(SelectTrigger, null),
      React.createElement(
        SelectContent,
        null,
        options.map(function (option) {
          return React.createElement(SelectItem, {
            key: option.value,
            value: option.value,
            children: option.label,
          })
        }),
      ),
    ),
  )
}
function SelectValue(_a) {
  const _b = _a.className,
    className = _b === void 0 ? '' : _b
  const { selectedLabel } = useSelectContext()
  return React.createElement(
    'span',
    { className: 'select-value '.concat(className) },
    selectedLabel,
  )
}
