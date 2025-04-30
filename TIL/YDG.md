# Today I learned

`윤덕건`

배운거 정리하기

### 2025-04-22

- 기획 회의

### 2025-04-23

# 📘 TIL – Redis Cluster 정리

## 🔹 Redis Cluster란?
- Redis의 **수평 확장**을 지원하는 분산형 구조
- 데이터를 **여러 노드에 샤딩(분산 저장)**하여 대용량 처리 가능
- **고가용성(Failover)**, **자동 샤딩**, **분산처리** 제공

## 🔹 핵심 개념

| 개념           | 설명 |
|----------------|------|
| **해시 슬롯**   | 키는 CRC16 해시를 통해 0~16383 사이의 슬롯 중 하나에 매핑됨 |
| **마스터 노드** | 데이터를 저장하고 클라이언트 요청을 처리 |
| **슬레이브 노드** | 마스터의 복제본, 장애 발생 시 자동 승격 |
| **자동 샤딩**   | 클러스터가 키를 자동으로 노드에 분산 저장 |
| **Failover**   | 마스터 장애 발생 시, 슬레이브가 자동으로 마스터로 승격 |

## 🔹 기본 구성

- **최소 권장 노드 수: 6개**
  - 마스터 3개
  - 각 마스터당 슬레이브 1개씩
- 클라이언트는 **슬롯-노드 맵핑 정보를 가지고 있음**

## 🔹 장점

- 데이터 분산 → 메모리 한계 극복
- 노드 장애 대응 → 서비스 무중단 운영
- 클러스터 자체가 샤딩을 관리 → 애플리케이션 부담 ↓

## 🔹 단점 및 제한 사항

- **멀티키 연산**은 같은 슬롯에 있을 때만 보장됨
- **Lua 스크립트**는 단일 노드에서만 실행됨
- 노드 간 **통신을 위한 네트워크 구성** 필요 (포트 16379 등 오픈 필요)

# ❓ 왜 Kafka, Redis는 기본 레플리카 수가 3?

## ✅ 핵심 이유 요약

### 1. 고가용성(High Availability)
- 노드 하나가 장애 나도 2개가 살아있어 서비스 유지 가능

### 2. 합의(Consensus) 구조에 적합
- 3개 중 2개 응답이면 다수결 합의 가능 → 안정적

### 3. 복제 비용 vs 안정성 균형
- 3개는 리소스 부담이 적으면서 장애 대응 능력도 뛰어남

## 🔸 관련 개념: Quorum(과반수 동의)

- 분산 시스템에서 다수의 동의가 필요할 때, 3개 중 2개 확보가 최소 요건
- Kafka ISR, Redis Sentinel 투표 로직 등에 활용됨

## 🎯 결론
> 3개 레플리카는 **속도, 안정성, 비용의 균형**을 가장 잘 맞춘 설정

### 2025-04-24

# Redis Sentinel 정리

## 🔍 개요
Redis Sentinel은 **Redis의 고가용성(HA, High Availability)** 을 보장하기 위한 기능이다.  
마스터 장애 발생 시 **자동으로 장애 조치(Failover)** 를 수행하고,  
클라이언트가 **새 마스터를 인지할 수 있도록** 돕는다.

## ✅ 주요 기능

| 기능 | 설명 |
|------|------|
| **모니터링 (Monitoring)** | Redis 서버들을 지속적으로 Ping 하여 장애 여부 감지 |
| **알림 (Notification)** | 장애 발생 시 관리자에게 알림 전송 |
| **자동 장애 조치 (Automatic Failover)** | 마스터 장애 시 슬레이브 중 하나를 새로운 마스터로 승격 |
| **구성 제공 (Configuration Provider)** | 클라이언트에게 현재의 마스터 정보를 알려줌 |

## 🔁 Sentinel 동작 방식

1. Sentinel 프로세스들이 Redis 마스터/슬레이브 상태를 감시
2. 마스터가 다운되면 여러 Sentinel이 투표하여 장애로 간주 (`Quorum`)
3. 슬레이브 중 하나를 새로운 마스터로 승격
4. 나머지 슬레이브는 새로운 마스터로 재구성
5. Sentinel은 클라이언트에게 **새 마스터 주소**를 알려줌

## ⚙️ 구성 예시 (`sentinel.conf`)

```bash
sentinel monitor mymaster 127.0.0.1 6379 2
sentinel down-after-milliseconds mymaster 5000
sentinel failover-timeout mymaster 10000
sentinel parallel-syncs mymaster 1
```

## ⚙️ Sentinel 설정 항목 설명

| 설정 항목 | 의미 |
|-----------|------|
| `sentinel monitor mymaster 127.0.0.1 6379 2` | 이름이 `mymaster`인 Redis 인스턴스를 Sentinel이 감시. `2`는 이 마스터가 다운되었다고 판단하기 위한 **최소 Sentinel 수(Quorum)** |
| `sentinel down-after-milliseconds mymaster 5000` | Sentinel이 5초간 마스터로부터 응답이 없으면 **장애로 판단** |
| `sentinel failover-timeout mymaster 10000` | failover 전체 과정(슬레이브 승격, 역할 재할당 등)을 수행할 **최대 시간(ms)** |
| `sentinel parallel-syncs mymaster 1` | 새로운 마스터로부터 데이터를 병렬로 **동기화할 슬레이브 수** (여러 슬레이브가 있을 경우 한 번에 1개씩 재동기화함) |

## 🧠 Sentinel 작동 흐름

1. Sentinel이 Redis 마스터 상태를 지속적으로 Ping  
2. Quorum 이상이 마스터를 장애로 판단 → 투표  
3. 슬레이브 중 하나를 마스터로 승격 (failover)  
4. 나머지 슬레이브는 새 마스터에 재연결  
5. 클라이언트는 Sentinel로부터 새 마스터 주소를 받아 재연결

## 📌 개념 요약

- **Quorum**: 장애 판단을 위한 Sentinel 최소 투표 수
- **Split Brain 방지**: 과반수 이상 Sentinel 동의 필요
- **Sentinel Cluster**: 여러 Sentinel이 서로 상태 공유하며 일관성 유지

## ⚠️ 주의사항

- Sentinel도 **분산 시스템** → 최소 3개 이상 운영 권장
- Sentinel은 Redis Cluster와는 다른 기능 (→ 분산 저장 아님)
- 클라이언트는 Sentinel 주소를 알고 있어야 하며  
  `redis-sentinel://` 방식으로 연결해야 동적 마스터 전환이 가능
