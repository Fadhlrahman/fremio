const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://hzhthvlsussqbwuhkfsh.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh6aHRodmxzdXNzcWJ3dWhrZnNoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQxMjU0ODIsImV4cCI6MjA3OTcwMTQ4Mn0._Sr_pJzLLwZL7JORmIe4yQh31ARcfHtlWVhXSYOHePw';

const supabase = createClient(supabaseUrl, supabaseKey);

// IDs to KEEP
const keepIds = [
  '7f5fe81b-4342-4049-ae6c-18e7b926cca8', // Cherish Pink Elegance
  'd3254c20-0d9b-4dc2-91ee-ea9a96fdb6f7', // Blue Picnic Vibes
  '02097dcc-5d75-468b-8d18-f11cc657b14b', // Our Love Memory
  '3f9bbc23-bc3a-43a2-805f-d81146096a50', // YIPIE
  'b33cf2aa-6ee8-4a85-b1a4-880cdc2c6a9a', // Snap Your Joy
  '8a9875dd-5960-4bec-9475-1071a5eb8af4', // Pixel Fun Adventure
];

async function deleteFrames() {
  try {
    const { data: allFrames, error: fetchError } = await supabase
      .from('frames')
      .select('id, name');
    
    if (fetchError) {
      console.error('Error fetching:', fetchError);
      return;
    }
    
    console.log('Total frames in DB:', allFrames.length);
    
    const toDelete = allFrames.filter(f => !keepIds.includes(f.id));
    const toKeep = allFrames.filter(f => keepIds.includes(f.id));
    
    console.log('\n📌 Frames to KEEP:', toKeep.length);
    toKeep.forEach(f => console.log('  ✓', f.name));
    
    console.log('\n🗑️  Frames to DELETE:', toDelete.length);
    toDelete.forEach(f => console.log('  -', f.name));
    
    console.log('\n🔄 Deleting...\n');
    
    for (const frame of toDelete) {
      const { error } = await supabase
        .from('frames')
        .delete()
        .eq('id', frame.id);
      
      if (error) {
        console.error('❌ Error deleting', frame.name, ':', error.message);
      } else {
        console.log('✅ Deleted:', frame.name);
      }
    }
    
    console.log('\n🎉 Done!');
  } catch (err) {
    console.error('Script error:', err);
  }
}

deleteFrames();
