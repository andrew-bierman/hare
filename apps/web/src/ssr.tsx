/// <reference types="vinxi/types/server" />
import { StartServer } from '@tanstack/react-start/server'
import { createHandler } from '@tanstack/react-start'
import { getRouter } from './router'

export default createHandler(() => <StartServer router={getRouter()} />)()
