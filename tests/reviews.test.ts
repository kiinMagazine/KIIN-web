import {describe,it,expect,beforeAll} from 'vitest';
import {reviewSchema,voteSchema} from '@/lib/validators';
const base={kind:'album',slug:'mapa-de-ecos',title:'Mapa de ecos',artist:'Colectivo ficticio',cover_media_id:null,analysis_md:'Texto',sources_md:'',spotify_url:null,youtube_url:null};
describe('Reseñas',()=>{
  beforeAll(()=>{process.env.NEXT_PUBLIC_SUPABASE_URL='';process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY='';});
  it('valida el esquema y rechaza slugs y enlaces ajenos',()=>{
    expect(reviewSchema.safeParse(base).success).toBe(true);
    expect(reviewSchema.safeParse({...base,slug:'Mapa de Ecos'}).success).toBe(false);
    expect(reviewSchema.safeParse({...base,kind:'ep'}).success).toBe(false);
    expect(reviewSchema.safeParse({...base,spotify_url:'https://evil.com/album/x'}).success).toBe(false);
  });
  it('limita la evaluación de 1 a 5 estrellas',()=>{
    const vote={review_id:'11111111-1111-4111-8111-111111111111',approved:true,stars_vote:4,comment:''};
    expect(voteSchema.safeParse(vote).success).toBe(true);
    expect(voteSchema.safeParse({...vote,stars_vote:0}).success).toBe(false);
    expect(voteSchema.safeParse({...vote,stars_vote:6}).success).toBe(false);
    expect(voteSchema.safeParse({...vote,stars_vote:3.5}).success).toBe(false);
  });
  it('las reseñas demo se listan, se buscan por artista y tienen calificación válida',async()=>{
    const {getReviews,getReviewBySlug,searchReviews}=await import('@/lib/data/reviews');
    const {items,count}=await getReviews({limit:12});
    expect(count).toBe(4);
    for(const r of items)expect(r.stars!*2).toBe(Math.round(r.stars!*2));
    expect((await getReviews({kind:'sencillo'})).items.every(r=>r.kind==='sencillo')).toBe(true);
    expect((await getReviewBySlug(items[0].slug))?.title).toBe(items[0].title);
    expect((await searchReviews('colectivo')).length).toBe(1);
    expect(await getReviewBySlug('no-existe')).toBeNull();
  });
});
