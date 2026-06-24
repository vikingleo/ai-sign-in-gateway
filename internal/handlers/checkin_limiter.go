package handlers

import (
	"context"
	"sync"

	"gorm.io/gorm"
)

var checkinLimiterRegistry = struct {
	sync.Mutex
	items map[*gorm.DB]*checkinLimiter
}{items: map[*gorm.DB]*checkinLimiter{}}

type checkinLimiter struct {
	mu          sync.Mutex
	cond        *sync.Cond
	siteLimit   int
	globalLimit int
	siteActive  map[string]int
	globalCount int
}

func checkinLimiterForDB(db *gorm.DB) *checkinLimiter {
	checkinLimiterRegistry.Lock()
	defer checkinLimiterRegistry.Unlock()
	limiter := checkinLimiterRegistry.items[db]
	if limiter == nil {
		limiter = newCheckinLimiter()
		checkinLimiterRegistry.items[db] = limiter
	}
	return limiter
}

func newCheckinLimiter() *checkinLimiter {
	limiter := &checkinLimiter{
		siteLimit:   defaultCheckinSiteConcurrency,
		globalLimit: defaultCheckinGlobalConcurrency,
		siteActive:  map[string]int{},
	}
	limiter.cond = sync.NewCond(&limiter.mu)
	return limiter
}

func (l *checkinLimiter) UpdateLimits(limits checkinExecutionSettings) {
	l.mu.Lock()
	l.siteLimit = normalizeCheckinLimit(limits.SiteConcurrency, defaultCheckinSiteConcurrency)
	l.globalLimit = normalizeCheckinLimit(limits.GlobalConcurrency, defaultCheckinGlobalConcurrency)
	l.cond.Broadcast()
	l.mu.Unlock()
}

func (l *checkinLimiter) Acquire(ctx context.Context, siteKey string) bool {
	if siteKey == "" {
		siteKey = "site:unknown"
	}
	l.mu.Lock()
	defer l.mu.Unlock()
	stop := context.AfterFunc(ctx, func() {
		l.mu.Lock()
		l.cond.Broadcast()
		l.mu.Unlock()
	})
	defer stop()
	for !l.canAcquire(siteKey) {
		if ctx.Err() != nil {
			return false
		}
		l.cond.Wait()
	}
	if ctx.Err() != nil {
		return false
	}
	l.siteActive[siteKey]++
	l.globalCount++
	return true
}

func (l *checkinLimiter) Release(siteKey string) {
	if siteKey == "" {
		siteKey = "site:unknown"
	}
	l.mu.Lock()
	if l.siteActive[siteKey] > 1 {
		l.siteActive[siteKey]--
	} else {
		delete(l.siteActive, siteKey)
	}
	if l.globalCount > 0 {
		l.globalCount--
	}
	l.cond.Broadcast()
	l.mu.Unlock()
}

func (l *checkinLimiter) canAcquire(siteKey string) bool {
	return l.globalCount < l.globalLimit && l.siteActive[siteKey] < l.siteLimit
}

const (
	defaultCheckinSiteConcurrency   = 1
	defaultCheckinGlobalConcurrency = 4
)

func normalizeCheckinLimit(value int, fallback int) int {
	if value > 0 {
		return value
	}
	return fallback
}
