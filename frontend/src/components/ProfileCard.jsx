import styles from './ProfileCard.module.css';

export default function ProfileCard() {
  return (
    <div className={`${styles.card} glass-panel`}>
      <div className={styles.avatarWrapper}>
        <img src="/avatar.jpg" alt="Profile Avatar" className={styles.avatar} />
        <div className={styles.pulseRing}></div>
      </div>
      
      <h3 className={styles.name}>Lyw</h3>
      <p className={styles.title}>유희왕 마술사 덱 플레이어</p>
      
      <p className={styles.bio}>
        마술사 계열 덱을 메인으로 유희왕을 즐기고 있습니다. 덱 레시피, 매치업 분석, 대회 메타 정보를 직접 테스트하고 기록합니다.
      </p>
      
      <div className={styles.socials}>
        <a href="https://github.com" target="_blank" rel="noopener noreferrer" className={styles.socialLink} aria-label="GitHub">
          GitHub
        </a>
        <span className={styles.dot}>•</span>
        <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer" className={styles.socialLink} aria-label="LinkedIn">
          LinkedIn
        </a>
        <span className={styles.dot}>•</span>
        <a href="mailto:admin@example.com" className={styles.socialLink} aria-label="Email">
          Email
        </a>
      </div>
    </div>
  );
}
