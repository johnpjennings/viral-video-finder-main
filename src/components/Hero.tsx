import { Zap, TrendingUp, Search } from "lucide-react";

const heroClassName = "py-12 text-center md:py-16";
const badgeClassName =
  "mb-6 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-2 animate-fade-in";
const headingClassName = "mb-6 text-4xl font-bold animate-fade-in md:text-6xl";
const subheadingClassName =
  "mx-auto mb-8 max-w-2xl text-lg text-muted-foreground animate-fade-in md:text-xl";
const featureRowClassName =
  "flex items-center justify-center gap-8 text-sm text-muted-foreground animate-fade-in";
const featureItemClassName = "flex items-center gap-2";

export function Hero() {
  return (
    <div className={heroClassName}>
      <div className={badgeClassName}>
        <Zap className="h-4 w-4 text-primary" />
        <span className="text-sm text-primary font-medium">YouTube Analytics Tool</span>
      </div>

      <h1 className={headingClassName} style={{ animationDelay: "0.1s" }}>
        <span className="text-foreground">Let's Create</span>
        <br />
        <span className="text-foreground">Something</span> <span className="text-gradient">AWESOME</span>
      </h1>

      <p
        className={subheadingClassName}
        style={{ animationDelay: "0.2s" }}
      >
        Discover trends, track projects, stay organized, be productive.
      </p>

      <div
        className={featureRowClassName}
        style={{ animationDelay: "0.3s" }}
      >
        <div className={featureItemClassName}>
          <Search className="h-4 w-4 text-primary" />
          <span>Explore Ideas</span>
        </div>
        <div className={featureItemClassName}>
          <TrendingUp className="h-4 w-4 text-success" />
          <span>Track Progress</span>
        </div>
        <div className={featureItemClassName}>
          <Zap className="h-4 w-4 text-warning" />
          <span>Be Productive</span>
        </div>
      </div>
    </div>
  );
}
