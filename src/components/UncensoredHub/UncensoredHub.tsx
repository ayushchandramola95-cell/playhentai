'use client';

import React from 'react';
import BrowseHub from '../BrowseHub/BrowseHub';

export default function UncensoredHub(props: any) {
  return <BrowseHub {...props} basePath={props.basePath || '/uncensored'} />;
}
