import styles from "./ImageDiff.module.css";
interface ImageDiffProps {
  path: string;
  beforeImage: string | null;
  afterImage: string | null;
}

export function ImageDiff({ path, beforeImage, afterImage }: ImageDiffProps) {
  return (
    <div className="diff-viewer">
      <div className="diff-viewer__header">
        <span className="diff-viewer__path">{path} (Image Diff)</span>
      </div>
      <div className={styles.style3}>
        {beforeImage ? (
          <div className={styles.style4}>
            <span className={styles.style5}>BEFORE</span>
            <div className={styles.style6}>
              <img src={beforeImage} alt="Before" className={styles.style7} />
            </div>
          </div>
        ) : (
          <div className={styles.style8}>
            No previous version (Added)
          </div>
        )}

        {afterImage ? (
          <div className={styles.style9}>
            <span className={styles.style10}>AFTER</span>
            <div className={styles.style11}>
              <img src={afterImage} alt="After" className={styles.style12} />
            </div>
          </div>
        ) : (
          <div className={styles.style13}>
            No current version (Deleted)
          </div>
        )}
      </div>
    </div>
  );
}
