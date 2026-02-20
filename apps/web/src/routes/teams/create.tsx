import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/teams/create')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/teams/create"!</div>
}
