import { describe, it, expect } from 'vitest'
import { groupActions, getGroupFieldName } from '../groupActions'

const makeAction = (overrides = {}) => ({
  id: 'a1',
  status: 'todo',
  channel: 'content',
  priority: 'medium',
  phase_id: null,
  kr_ids: [],
  ...overrides,
})

describe('groupActions', () => {
  describe('group by status', () => {
    it('places action in correct status column', () => {
      const actions = [makeAction({ status: 'todo' }), makeAction({ id: 'a2', status: 'done' })]
      const groups = groupActions(actions, 'status')

      const todoGroup = groups.find((g) => g.key === 'todo')
      const doneGroup = groups.find((g) => g.key === 'done')

      expect(todoGroup.actions).toHaveLength(1)
      expect(doneGroup.actions).toHaveLength(1)
    })

    it('returns all status columns even if empty', () => {
      const groups = groupActions([], 'status')
      expect(groups.length).toBeGreaterThanOrEqual(4)
    })
  })

  describe('group by channel', () => {
    it('places action in correct channel column', () => {
      const actions = [makeAction({ channel: 'seo' })]
      const groups = groupActions(actions, 'channel')
      const seoGroup = groups.find((g) => g.key === 'seo')
      expect(seoGroup.actions).toHaveLength(1)
    })

    it('puts unknown channel in fallback', () => {
      const actions = [makeAction({ channel: 'unknown_channel' })]
      const groups = groupActions(actions, 'channel')
      // Should land in "other" or first available column
      const totalActions = groups.reduce((sum, g) => sum + g.actions.length, 0)
      expect(totalActions).toBe(1)
    })
  })

  describe('group by priority', () => {
    it('places action in correct priority column', () => {
      const actions = [makeAction({ priority: 'high' })]
      const groups = groupActions(actions, 'priority')
      const highGroup = groups.find((g) => g.key === 'high')
      expect(highGroup.actions).toHaveLength(1)
    })
  })

  describe('group by phase (dynamic)', () => {
    it('uses dynamic phases when provided', () => {
      const phases = [
        { id: 'p1', name: 'Phase 1', color_hex: '#FF0000', position: 0 },
        { id: 'p2', name: 'Phase 2', color_hex: '#00FF00', position: 1 },
      ]
      const actions = [makeAction({ phase_id: 'p1' })]
      const groups = groupActions(actions, 'phase', {}, phases)

      expect(groups.find((g) => g.key === 'p1').actions).toHaveLength(1)
      expect(groups.find((g) => g.key === 'unassigned')).toBeDefined()
    })

    it('puts unphased actions in unassigned', () => {
      const actions = [makeAction({ phase_id: null })]
      const groups = groupActions(actions, 'phase', {}, [])
      const unassigned = groups.find((g) => g.key === 'unassigned')
      expect(unassigned.actions).toHaveLength(1)
    })
  })

  describe('group by team', () => {
    it('resolves team from uuidToTeam map', () => {
      const uuidToTeam = { 'uuid-1': 'sales' }
      const actions = [makeAction({ kr_ids: ['uuid-1'] })]
      const groups = groupActions(actions, 'team', uuidToTeam)
      const salesGroup = groups.find((g) => g.key === 'sales')
      expect(salesGroup.actions).toHaveLength(1)
    })

    it('puts actions without kr_ids in unlinked', () => {
      const actions = [makeAction({ kr_ids: [] })]
      const groups = groupActions(actions, 'team', {})
      const unlinked = groups.find((g) => g.key === 'unlinked')
      expect(unlinked.actions).toHaveLength(1)
    })
  })

  describe('group by KR', () => {
    it('groups actions by resolved KR id', () => {
      const krStatuses = {
        'S1.1': { uuid: 'uuid-1', team: 'sales', progress: 0 },
        'S1.2': { uuid: 'uuid-2', team: 'sales', progress: 0 },
      }
      const actions = [
        makeAction({ kr_ids: ['uuid-1'] }),
        makeAction({ id: 'a2', kr_ids: ['uuid-2'] }),
      ]
      const groups = groupActions(actions, 'kr', {}, [], krStatuses)

      expect(groups.find((g) => g.key === 'S1.1').actions).toHaveLength(1)
      expect(groups.find((g) => g.key === 'S1.2').actions).toHaveLength(1)
    })

    it('duplicates action across multiple KRs', () => {
      const krStatuses = {
        'S1.1': { uuid: 'uuid-1', team: 'sales', progress: 0 },
        'M1.1': { uuid: 'uuid-2', team: 'marketing', progress: 0 },
      }
      const actions = [makeAction({ kr_ids: ['uuid-1', 'uuid-2'] })]
      const groups = groupActions(actions, 'kr', {}, [], krStatuses)

      expect(groups.find((g) => g.key === 'S1.1').actions).toHaveLength(1)
      expect(groups.find((g) => g.key === 'M1.1').actions).toHaveLength(1)
    })

    it('puts actions without kr_ids in unlinked', () => {
      const actions = [makeAction({ kr_ids: [] })]
      const groups = groupActions(actions, 'kr', {}, [], {})
      expect(groups.find((g) => g.key === 'unlinked').actions).toHaveLength(1)
    })
  })
})

describe('getGroupFieldName', () => {
  it('returns correct field names', () => {
    expect(getGroupFieldName('status')).toBe('status')
    expect(getGroupFieldName('channel')).toBe('channel')
    expect(getGroupFieldName('priority')).toBe('priority')
    expect(getGroupFieldName('phase')).toBe('phase_id')
  })

  it('returns fallback "status" for non-draggable groupings (team, kr)', () => {
    // team and kr map to null in the config, but ?? coalesces to "status"
    expect(getGroupFieldName('team')).toBe('status')
    expect(getGroupFieldName('kr')).toBe('status')
  })

  it('defaults to status for unknown groupBy', () => {
    expect(getGroupFieldName('unknown')).toBe('status')
  })
})
