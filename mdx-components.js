import Accordion from './src/components/docs/Accordion.astro';
import AccordionGroup from './src/components/docs/AccordionGroup.astro';
import Card from './src/components/docs/Card.astro';
import CardGrid from './src/components/docs/CardGrid.astro';
import CardGroup from './src/components/docs/CardGroup.astro';
import Cards from './src/components/docs/Cards.astro';
import Check from './src/components/docs/Check.astro';
import CodeGroup from './src/components/docs/CodeGroup.astro';
import Expandable from './src/components/docs/Expandable.astro';
import Frame from './src/components/docs/Frame.astro';
import Info from './src/components/docs/Info.astro';
import Latex from './src/components/docs/Latex.astro';
import Note from './src/components/docs/Note.astro';
import ResponseField from './src/components/docs/ResponseField.astro';
import SnippetIntro from './src/components/docs/SnippetIntro.astro';
import Steps from './src/components/docs/Steps.astro';
import Tab from './src/components/docs/Tab.astro';
import TabItem from './src/components/docs/TabItem.astro';
import Tabs from './src/components/docs/Tabs.astro';
import Tip from './src/components/docs/Tip.astro';
import Warning from './src/components/docs/Warning.astro';

// Named exports for direct imports
export {
  Accordion,
  AccordionGroup,
  Card,
  CardGrid,
  CardGroup,
  Cards,
  Check,
  CodeGroup,
  Expandable,
  Frame,
  Info,
  Latex,
  Note,
  ResponseField,
  SnippetIntro,
  Steps,
  Tab,
  TabItem,
  Tabs,
  Tip,
  Warning,
};

// Components object for MDX configuration
export const mdxComponents = {
  Accordion,
  AccordionGroup,
  Card,
  CardGrid,
  CardGroup,
  Cards,
  Check,
  CodeGroup,
  Expandable,
  Frame,
  Info,
  Latex,
  Note,
  ResponseField,
  SnippetIntro,
  Steps,
  Tab,
  TabItem,
  Tabs,
  Tip,
  Warning,
};

// Default export for MDX configuration
export default mdxComponents;
