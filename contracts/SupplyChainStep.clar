(define-constant ERR-NOT-AUTHORIZED (err u100))
(define-constant ERR-INVALID-BATCH (err u101))
(define-constant ERR-ALREADY-LOGGED (err u102))
(define-constant ERR-INVALID-LOCATION (err u103))
(define-constant ERR-INVALID-DOC-HASH (err u104))
(define-constant ERR-INVALID-DETAILS (err u105))
(define-constant ERR-INVALID-OWNER (err u106))
(define-constant ERR-INVALID-STEP-ID (err u107))
(define-constant ERR-BATCH-NOT-ACTIVE (err u108))
(define-constant ERR-TRANSFER-NOT-ALLOWED (err u109))
(define-constant ERR-INVALID-TIMESTAMP (err u110))
(define-constant ERR-MAX-STEPS-EXCEEDED (err u111))
(define-constant ERR-INVALID-COMPLIANCE-STATUS (err u112))
(define-constant ERR-INVALID-METADATA (err u113))
(define-constant ERR-INVALID-PREVIOUS-STEP (err u114))
(define-constant ERR-BATCH-LOCKED (err u115))
(define-constant ERR-INVALID-ROLE (err u116))
(define-constant ERR-INVALID-ACTION (err u117))
(define-constant ERR-INVALID-PARAMETER (err u118))
(define-constant ERR-INVALID-UPDATE (err u119))
(define-constant ERR-INVALID-QUERY (err u120))

(define-data-var step-counter uint u0)
(define-data-var max-steps-per-batch uint u50)
(define-data-var admin principal tx-sender)

(define-map BatchSteps
  { batch-id: uint, step-id: uint }
  { owner: principal,
    timestamp: uint,
    location: (string-ascii 100),
    doc-hash: (buff 32),
    details: (string-ascii 200),
    compliance-status: bool,
    metadata: (string-ascii 500) }
)

(define-map BatchOwners
  { batch-id: uint }
  { current-owner: principal, active: bool, locked: bool }
)

(define-map BatchStepCounters
  { batch-id: uint }
  { next-step-id: uint }
)

(define-map UserRoles
  { user: principal }
  { role: (string-ascii 50) }
)

(define-private (validate-location (loc (string-ascii 100)))
  (if (and (> (len loc) u0) (<= (len loc) u100))
    (ok true)
    (err ERR-INVALID-LOCATION))
)

(define-private (validate-doc-hash (hash (buff 32)))
  (if (is-eq (len hash) u32)
    (ok true)
    (err ERR-INVALID-DOC-HASH))
)

(define-private (validate-details (det (string-ascii 200)))
  (if (<= (len det) u200)
    (ok true)
    (err ERR-INVALID-DETAILS))
)

(define-private (validate-owner (own principal))
  (if (not (is-eq own 'SP000000000000000000002Q6VF78))
    (ok true)
    (err ERR-INVALID-OWNER))
)

(define-private (validate-timestamp (ts uint))
  (if (>= ts block-height)
    (ok true)
    (err ERR-INVALID-TIMESTAMP))
)

(define-private (validate-compliance (status bool))
  (ok true)
)

(define-private (validate-metadata (meta (string-ascii 500)))
  (if (<= (len meta) u500)
    (ok true)
    (err ERR-INVALID-METADATA))
)

(define-private (validate-role (user principal) (required-role (string-ascii 50)))
  (let ((user-role (default-to "" (get role (map-get? UserRoles { user: user })))))
    (if (is-eq user-role required-role)
      (ok true)
      (err ERR-INVALID-ROLE)))
)

(define-private (is-batch-owner (batch-id uint) (user principal))
  (let ((owner-info (unwrap! (map-get? BatchOwners { batch-id: batch-id }) (err ERR-INVALID-BATCH))))
    (if (is-eq (get current-owner owner-info) user)
      (ok true)
      (err ERR-NOT-AUTHORIZED)))
)

(define-private (is-batch-active (batch-id uint))
  (let ((owner-info (unwrap! (map-get? BatchOwners { batch-id: batch-id }) (err ERR-INVALID-BATCH))))
    (if (get active owner-info)
      (ok true)
      (err ERR-BATCH-NOT-ACTIVE)))
)

(define-private (is-batch-unlocked (batch-id uint))
  (let ((owner-info (unwrap! (map-get? BatchOwners { batch-id: batch-id }) (err ERR-INVALID-BATCH))))
    (if (not (get locked owner-info))
      (ok true)
      (err ERR-BATCH-LOCKED)))
)

(define-public (initialize-batch (batch-id uint) (initial-owner principal) (role (string-ascii 50)))
  (begin
    (try! (validate-owner initial-owner))
    (asserts! (is-none (map-get? BatchOwners { batch-id: batch-id })) (err ERR-ALREADY-LOGGED))
    (map-set BatchOwners { batch-id: batch-id } { current-owner: initial-owner, active: true, locked: false })
    (map-set BatchStepCounters { batch-id: batch-id } { next-step-id: u1 })
    (map-set UserRoles { user: initial-owner } { role: role })
    (ok true))
)

(define-public (log-step (batch-id uint) (location (string-ascii 100)) (doc-hash (buff 32)) (details (string-ascii 200)) (compliance bool) (metadata (string-ascii 500)))
  (let ((step-id (default-to u0 (get next-step-id (map-get? BatchStepCounters { batch-id: batch-id }))))
        (prev-step-id (- step-id u1)))
    (try! (is-batch-owner batch-id tx-sender))
    (try! (is-batch-active batch-id))
    (try! (is-batch-unlocked batch-id))
    (try! (validate-location location))
    (try! (validate-doc-hash doc-hash))
    (try! (validate-details details))
    (try! (validate-compliance compliance))
    (try! (validate-metadata metadata))
    (asserts! (> step-id u0) (err ERR-INVALID-STEP-ID))
    (if (> prev-step-id u0)
      (asserts! (is-some (map-get? BatchSteps { batch-id: batch-id, step-id: prev-step-id })) (err ERR-INVALID-PREVIOUS-STEP))
      (ok true))
    (asserts! (< step-id (var-get max-steps-per-batch)) (err ERR-MAX-STEPS-EXCEEDED))
    (map-set BatchSteps
      { batch-id: batch-id, step-id: step-id }
      { owner: tx-sender,
        timestamp: block-height,
        location: location,
        doc-hash: doc-hash,
        details: details,
        compliance-status: compliance,
        metadata: metadata })
    (map-set BatchStepCounters { batch-id: batch-id } { next-step-id: (+ step-id u1) })
    (var-set step-counter (+ (var-get step-counter) u1))
    (print { event: "step-logged", batch-id: batch-id, step-id: step-id })
    (ok step-id))
)

(define-public (transfer-ownership (batch-id uint) (new-owner principal))
  (begin
    (try! (is-batch-owner batch-id tx-sender))
    (try! (is-batch-active batch-id))
    (try! (validate-owner new-owner))
    (map-set BatchOwners { batch-id: batch-id }
      (merge (unwrap! (map-get? BatchOwners { batch-id: batch-id }) (err ERR-INVALID-BATCH))
        { current-owner: new-owner }))
    (print { event: "ownership-transferred", batch-id: batch-id, new-owner: new-owner })
    (ok true))
)

(define-public (lock-batch (batch-id uint))
  (begin
    (try! (is-batch-owner batch-id tx-sender))
    (try! (is-batch-active batch-id))
    (map-set BatchOwners { batch-id: batch-id }
      (merge (unwrap! (map-get? BatchOwners { batch-id: batch-id }) (err ERR-INVALID-BATCH))
        { locked: true }))
    (print { event: "batch-locked", batch-id: batch-id })
    (ok true))
)

(define-public (deactivate-batch (batch-id uint))
  (begin
    (try! (is-batch-owner batch-id tx-sender))
    (map-set BatchOwners { batch-id: batch-id }
      (merge (unwrap! (map-get? BatchOwners { batch-id: batch-id }) (err ERR-INVALID-BATCH))
        { active: false }))
    (print { event: "batch-deactivated", batch-id: batch-id })
    (ok true))
)

(define-public (set-user-role (user principal) (role (string-ascii 50)))
  (begin
    (asserts! (is-eq tx-sender (var-get admin)) (err ERR-NOT-AUTHORIZED))
    (map-set UserRoles { user: user } { role: role })
    (ok true))
)

(define-public (set-max-steps (new-max uint))
  (begin
    (asserts! (is-eq tx-sender (var-get admin)) (err ERR-NOT-AUTHORIZED))
    (asserts! (> new-max u0) (err ERR-INVALID-PARAMETER))
    (var-set max-steps-per-batch new-max)
    (ok true))
)

(define-read-only (get-batch-owner (batch-id uint))
  (ok (get current-owner (map-get? BatchOwners { batch-id: batch-id })))
)

(define-read-only (get-batch-status (batch-id uint))
  (let ((info (map-get? BatchOwners { batch-id: batch-id })))
    (ok { active: (get active info), locked: (get locked info) })))

(define-read-only (get-step-details (batch-id uint) (step-id uint))
  (map-get? BatchSteps { batch-id: batch-id, step-id: step-id }))

(define-read-only (get-next-step-id (batch-id uint))
  (ok (get next-step-id (map-get? BatchStepCounters { batch-id: batch-id }))))

(define-read-only (get-user-role (user principal))
  (ok (get role (map-get? UserRoles { user: user }))))