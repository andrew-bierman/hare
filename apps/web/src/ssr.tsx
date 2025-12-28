/// <reference types="vinxi/types/server" />

import { createHandler } from '@tanstack/react-start'
import { StartServer } from '@tanstack/react-start/server'
import { getRouter } from './router'

export default createHandler(() => <StartServer router={getRouter()} />)()
