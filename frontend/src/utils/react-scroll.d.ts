declare module 'react-scroll' {
  import * as React from 'react';

  export interface LinkProps {
    to: string;
    spy?: boolean;
    smooth?: boolean | string;
    offset?: number;
    duration?: number;
    delay?: number;
    isDynamic?: boolean;
    ignoreCancelEvents?: boolean;
    hashSpy?: boolean;
    onSetActive?: (to: string) => void;
    onSetInactive?: (to: string) => void;
    onSetSpy?: (to: string, element: HTMLElement) => void;
    activeClass?: string;
    containerId?: string;
    className?: string;
    style?: React.CSSProperties;
    children?: React.ReactNode;
  }

  export class Link extends React.Component<LinkProps> {}

  export interface ElementProps {
    name: string;
    id?: string;
    className?: string;
    style?: React.CSSProperties;
    children?: React.ReactNode;
  }

  export class Element extends React.Component<ElementProps> {}

  export const Events: {
    scrollEvent: {
      register(event: string, callback: (...args: any[]) => void): void;
      remove(event: string): void;
    };
  };

  export const animateScroll: {
    scrollToTop(options?: Record<string, any>): void;
    scrollToBottom(options?: Record<string, any>): void;
    scrollTo(to: number, options?: Record<string, any>): void;
  };

  export function scroller(
    name: string,
    options?: Record<string, any>
  ): void;
}
